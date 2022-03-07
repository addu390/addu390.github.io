---
layout: post
title: "Stockpile — Store Request and Response"
date: 2022-01-19
tags:
  - Django
  - Dropwizard
  - Java
author: Adesh Nalpet Adimurthy
feature: assets/featured/stock-pile.png
avatar: assets/profile.jpeg
category: Java Lava 🏝
---

<img src="./assets/featured/stock-pile.png" /> 
<p style="text-align: center;">One Piece — Whaaaat? You don’t use Stock Pile?</p>

For most applications, it is quite crucial to store the request and response of APIs, especially while integrating with external service providers.
Logging this information solves for most of the use cases, but might not when the request/ response contains sensitive information.

In such cases, one way would be to encrypt and store both the request and the response, this is exactly what we will be doing in this post.

## Overview :

- Methods/ commands whose request and response are to be stored are annotated with `@StockPile`.
- Arguments of the method to be stored are annotated with `@Item`.
- Method interceptor to encrypt and store the request, response/ exception of these methods.

```
@Retention(RetentionPolicy.RUNTIME)
@Target({METHOD})
@BindingAnnotation
public @interface StockPile {
}
```

`@StockPile` annotation is only for methods, `@Target` – METHOD

```
@Retention(RetentionPolicy.RUNTIME)
@Target({FIELD, PARAMETER})
@BindingAnnotation
public @interface Item {
}
```

`@Item` is for arguments of a method, `@Target` – PARAMETER

```
@Slf4j
public class StockPileModule extends AbstractModule {

    @Override
    protected void configure() {
        final StockPileInterceptor stockPileInterceptor = new StockPileInterceptor();
        requestInjection(stockPileInterceptor);
        bindInterceptor(Matchers.any(), Matchers.annotatedWith(StockPile.class), stockPileInterceptor);
    }

    @VisibleForTesting
    public static class StockPileInterceptor implements MethodInterceptor {

        @VisibleForTesting
        @Inject
        protected YourEncryptionService encryptionService;

        @VisibleForTesting
        @Inject
        protected YourStorageService storageDao;

        @VisibleForTesting
        @Inject
        protected ObjectMapper objectMapper;

        @Override
        public Object invoke(MethodInvocation invocation) throws Throwable {
            final Optional<Annotation> optionalAnnotation = Stream.of(invocation.getMethod().getDeclaredAnnotations())
                    .filter(annotation -> annotation instanceof StockPile)
                    .findFirst();

            if (optionalAnnotation.isPresent()) {
                List<Object> requests = new ArrayList<>();
                final String methodName = invocation.getMethod().getName();
                final Annotation[][] parameterAnnotations = invocation.getMethod().getParameterAnnotations();

                for (int index = 0; index < parameterAnnotations.length; ++index) {
                    for (final Annotation annotation : parameterAnnotations[index]) {
                        if (annotation instanceof Item) {
                            requests.add(invocation.getArguments()[index]);
                        }
                    }
                }
                final Object response;
                try {
                    response = invocation.proceed();
                    storageDao.save(requests, response, methodName);
                } catch (Exception e) {
                    storageDao.save(requests, e, methodName);
                    throw e;
                }
                return response;
            }
            return invocation.proceed();
        }
    }   
}
```

The scope of this post, is to generalise the storage of request and response.
It’s upto to the developer to decide what sort of encryption and data store for storage of these blobs (NoSQL such as AeroSpike is a good option to consider) would be.

As seen in the method interceptor above, we first validate if the method is annotated with @StockPile, then all the arguments annotated with @Item is added to a `List<Object>`

`storageDao.save` takes three arguments:

- Request (`Object`)
- Response or Exception (`Object`)
- Method name (`String`)

```
private void save(Object request, Object response, String commandName) {
    try {
        final String userId = MDC.get(RequestContext.REQUEST_USER_ID);
        final String requestId = MDC.get(RequestContext.REQUEST_ID);
        
        final String workflowId = Objects.nonNull(REQUEST_USER_ID) ? userId.concat("_").concat(requestId) : userId;
        final Date currentDate = new Date();

        Optional<RequestResponseBlob> requestResponseBlob = storageDao
                .get(workflowId, commandName);

        final byte[] encryptedRequest = objectMapper.writeValueAsBytes(encryptionService.encrypt(request));
        final byte[] encryptedResponse = objectMapper.writeValueAsBytes(encryptionService.encrypt(response));

        if (storedOutboundMessage.isPresent()) {
            RequestResponseBlob presentRequestResponse = requestResponseBlob.get();
            presentRequestResponse.setRequest(encryptedRequest);
            presentRequestResponse.setResponse(encryptedResponse);
            presentRequestResponse.setUpdated(currentDate);
            storageDao.update(presentRequestResponse);
        } else {
            storageDao.save(RequestResponseBlob.builder()
                    .commandType(commandName)
                    .workflowId(workflowId)
                    .requestId(requestId)
                    .request(encryptedRequest)
                    .response(encryptedResponse)
                    .created(currentDate)
                    .updated(currentDate)
                    .build());
        }
    } catch (Exception e) {
        log.error("[STOCKPILE] Error while storing");
    }
}
```

Refer to the previous post for storing userId and requestId in `MDC`.
For the sake of querying, using `userId`, `requestId` along with the method name would be ideal as shown above.

## Usage:

```
@StockPile
public Response externalServiceCommandOne(@Item final SensitiveInformationRequest request, final String token) {
  Response response;
  // Stuff here
  return response
}
```

That’s it! Done 🚀 