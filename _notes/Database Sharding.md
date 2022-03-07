---
tags: Database
---

Users at ClearTax were broadly classified into:

- SME (Micro, Small, and Medium enterprises).
- CA (Micro, Small, and Medium chartered accountants).
- Large Enterprise.

By the last quarter of 2018, more than 200 enterprise users (have 20+ lakhs of invoices per year) were to be onboarded to use ClearTax for GST filing, and hence comes the need for scaling the database (The very well known bottleneck).

The RDS (AWS Relational Database Service – MySQL) used was db.m5.24xlarge with 2TB+ disk storage, with provisioned IOPS.
The database was highly on stress, with more users getting onboarded, we finally decided to do database sharding.

## About the database:

- Unlike most other use-cases, the database was write-heavy, hence, caching or use of read replicas was never an option.
- Index size was already huge, schema migrations used to take hours and sometimes days (Online database migrations) and longer duration for backups (AWS RDS Snapshots)
- Archiving old rows was also out of hand since GST was introduced recently (July 2017), and older data was required for filing.
- Query level optimization was already saturated, indexes were used to the best of it.

At this point, horizontal sharding of the database was evident – adding more machines to an existing stack in order to spread out the load and allow for more traffic and faster processing (Query response time).
While there are several ways of horizontal sharding, the strategy we used was key/ hash based sharding.

## Requirements:

- DB to be shared by business_id (user_id – business_id one to many relationship).
- Supports `@UnitOfWork` – Automicity of transactions – (This will automatically open a session, begin a transaction, commit the transaction, and finally close the session. If an exception is thrown, the transaction is rolled back).
- Support nested `@UnitOfWork` – To allow checkpointing (Not supported in Dropwizard)
- Abstraction – Requires minimal or NIL code changes in the existing codebase.
- Migration strategy – Ease of migrations of accounts to new shards.
- Balancing the shards – Type of users and active users across shards should ideally be similar.

## Implementation:

- A bucket is an intermediate virtual-shard to which shardKey (shardKey is the unique identifier on which data is sharded, business_id in our case) gets mapped to, each bucket has n number of businesses.
- Each shard has (total no of buckets/ number of shards) buckets, although there is no strict rule to ensure buckets to be equally distributed across shards.

Underlying DB sharding bundle used: [dropwizard-db-sharding-bundle](https://github.com/santanusinha/dropwizard-db-sharding-bundle)

```

    @GET
    @Timed
    @ExceptionMetered
    @Path("{id}/shard1")
    @Produces(MediaType.APPLICATION_JSON)
    @PermitAll
    @UnitOfWork
    // @TenantIdentifier(useDefault = false, tenantIdentifier = "shard1")
    public OrderDto getOrderFromShard1(@PathParam("id") long id) {
        return orderService.getOrder(id);
    }
```

Consider the above above resource method annotated with `@UnitOfWork`

`UnitOfWorkInterceptor` by using Guice’s AOP would intercept the method call and figure out the shardId then initiate the transaction.

```
@Slf4j
public class UnitOfWorkModule extends AbstractModule {

    @Override
    protected void configure() {
        UnitOfWorkInterceptor interceptor = new UnitOfWorkInterceptor();
        bindInterceptor(Matchers.any(), Matchers.annotatedWith(UnitOfWork.class), interceptor);
        requestInjection(interceptor);
    }

    private static class UnitOfWorkInterceptor implements MethodInterceptor {

        @Inject
        BucketResolver bucketResolver;
        @Inject
        ShardResolver shardResolver;
        @Inject
        ShardKeyProvider shardKeyProvider;
        @Inject
        MultiTenantSessionSource multiTenantSessionSource;

        @Override
        public Object invoke(MethodInvocation mi) throws Throwable {
            String tenantId = getTenantIdentifier(mi);
            Objects.requireNonNull(tenantId, "No tenant-identifier found for this session");

            TransactionRunner runner = new TransactionRunner(multiTenantSessionSource.getUnitOfWorkAwareProxyFactory(),
                    multiTenantSessionSource.getSessionFactory(),
                    new ConstTenantIdentifierResolver(tenantId)) {
                @Override
                public Object run() throws Throwable {
                    return mi.proceed();
                }
            };
            return runner.start(mi.getMethod().isAnnotationPresent(ReuseSession.class),
                    mi.getMethod().getAnnotation(UnitOfWork.class));
        }

        private String getTenantIdentifier(MethodInvocation mi) {
            String tenantId;
            if (!multiTenantSessionSource.getDataSourceFactory().isAllowMultipleTenants()) {
                tenantId = getDefaultTenant();
            } else if (this.isExplicitTenantIdentifierPresent(mi)) {
                TenantIdentifier tenantIdentifier = mi.getMethod().getAnnotation(TenantIdentifier.class);
                tenantId = extractTenantIdentifier(tenantIdentifier);
            } else {
                tenantId = resolveTenantIdentifier(shardKeyProvider.getKey());
            }
            return tenantId;
        }

        private String getDefaultTenant() {
            return multiTenantSessionSource.getDataSourceFactory().getDefaultTenant();
        }

        private boolean isExplicitTenantIdentifierPresent(MethodInvocation mi) {
            return mi.getMethod().isAnnotationPresent(TenantIdentifier.class);
        }

        private String extractTenantIdentifier(TenantIdentifier tenantIdentifier) {
            if (tenantIdentifier.useDefault()) {
                return getDefaultTenant();
            }
            Preconditions.checkArgument(StringUtils.isNotBlank(tenantIdentifier.tenantIdentifier()),
                    "When useDefault = false, tenantIdentifier is mandatory");
            return tenantIdentifier.tenantIdentifier();
        }

        private String resolveTenantIdentifier(String shardKey) {
            String tenantId;
            if (shardKey != null) {
                String bucketId = bucketResolver.resolve(shardKey);
                tenantId = shardResolver.resolve(bucketId);
            } else {
                tenantId = DelegatingTenantResolver.getInstance().resolveCurrentTenantIdentifier();
            }
            return tenantId;
        }
    }
}
```

### For this to work:

`UnitOfWorkInterceptor` calls the implementation of ShardKeyProvider to map the shardKey to a bucket.

```
public interface ShardKeyProvider {
    String getKey();

    void setKey(String shardId);
}
```

`UnitOfWorkInterceptor` calls the implementation of BucketResolver to figure out shardId

```
public interface BucketResolver {
    String resolve(String shardKey);
}
```

### Implementation example:

```
@RequiredArgsConstructor(onConstructor = @__(@Inject))
public class DbBasedShardResolver implements ShardResolver {

    private final BucketToShardMappingDAO dao;

    @Override
    @UnitOfWork
    @DefaultTenant
    @ReuseSession
    public String resolve(String bucketId) {
        Optional<String> shardId = dao.getShardId(bucketId);
        if (!shardId.isPresent()) {
            throw new IllegalAccessError(String.format("%s bucket not mapped to any shard", bucketId));
        }
        return shardId.get();
    }
}
```

To connect to the right shard set-up shardKey for every incoming HTTP request.

```
@Provider
@RequiredArgsConstructor(onConstructor = @__(@Inject))
public class ShardKeyFeature implements DynamicFeature {

    private final ShardKeyProvider shardKeyProvider;

    @Override
    public void configure(ResourceInfo resourceInfo, FeatureContext context) {
        context.register(new ShardKeyFilter(shardKeyProvider));
    }
}
```

In scenarios, where the shard-key is not present in the request, set-up shard key manually – Get an instance of ShardKeyProvider and then do:

```
try {
  shardKeyProvider.setKey("shard-key")
  // Call your method which is annotated with @UnitOfWork
} finally {
  shardKeyProvider.clear();
}
```

To give an example on how the master shard would look like (look-up tables for shard-resolution is domain specific), refer the below script:

```
DROP TABLE IF EXISTS `customer_bucket`;
CREATE TABLE `customer_bucket` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` varchar(255) DEFAULT NULL,
  `bucket_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
);

DROP TABLE IF EXISTS `bucket_shard`;
CREATE TABLE `bucket_shard` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `bucket_id` varchar(255) DEFAULT NULL,
  `shard_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uidx_bucketidshardid_bucketshardmapping` (`bucket_id`,`shard_id`)
);

CREATE TABLE `customer` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_name` varchar(255) DEFAULT NULL,
  `external_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uidx_username_customer` (`user_name`),
  UNIQUE KEY `uidx_externalid_customer` (`external_id`),
);

INSERT INTO `customer_bucket` (`customer_id`, `bucket_id`) VALUES ('1', '1');
INSERT INTO `customer_bucket` (`customer_id`, `bucket_id`) VALUES ('2', '2');
INSERT INTO `customer_bucket` (`customer_id`, `bucket_id`) VALUES ('3', '3');

INSERT INTO `bucket_shard` (`bucket_id`, `shard_id`) VALUES ('1', 'shard1');
INSERT INTO `bucket_shard` (`bucket_id`, `shard_id`) VALUES ('2', 'shard1');
INSERT INTO `bucket_shard` (`bucket_id`, `shard_id`) VALUES ('3', 'shard2');

INSERT INTO `customer` (`user_name`, `external_id`) VALUES ('1', 'e27c1ff7-c8f5-4da0-bcee-b0988d81bc27');
INSERT INTO `customer` (`user_name`, `external_id`) VALUES ('2', 'e27c1ff7-c8f5-4da0-bcee-b0988d81bc28');
INSERT INTO `customer` (`user_name`, `external_id`) VALUES ('3', 'e27c1ff7-c8f5-4da0-bcee-b0988d81bc29');
```

## Benefits:

- Better query response time.
- Scaling to handle more users and traffic was more reliable, contrasted with vertical scaling which involves upgrading the hardware of an existing server, usually by adding more RAM or CPU
- An outage had the potential to make the entire application unavailable with a monolithic database. With a sharded database, an outage was likely to affect only a single shard, thereby, parts of the application were unavailable only to some users.
- Certain enterprise users prefer to maintain their own database for privacy concerns, which could be facilitated with sharding.
- Paid users were migrated to a shard with more resources, thereby cost for free users can be minimal.
- Very large enterprise users were facilitated with dedicated shards.
- The cost on AWS RDS was cheaper to have multiple shards of lesser resources (16x when combined) as compared to a 24x large machine.