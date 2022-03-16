---
layout: post
title: "MDC : Improving debugging/logging"
date: 2021-12-27
tags:
  - Dropwizard
  - Java
author: Adesh Nalpet Adimurthy
feature: assets/featured/bob-mdc.png
avatar: assets/profile.jpeg
category: Java Lava
---

<img src="./assets/featured/bob-mdc.png" /> 
<p style="text-align: center;">Bob the builder, agrees!</p>

Construct your logs as good as Bob the Builder!

Usually in most of the backend applications, a separate thread from the thread pool processes a client request. Once the request is completed, the thread is returned to the thread pool and it’s typical logs are generated.

What are we trying to solve? Let’s take an example.

## Example:

Consider a case where two users have logged in and are retrieving data from the database. It is easy to unravel which log statement belongs to which request by differentiating with thread ID. This thread-based correlation of logs is a useful technique to identify all the logs from a single request. However, with this technique, we could not differentiate which request belongs to which user. Now, things get even messier when multithreading is implemented.

## Partial solution:

One of the approaches could be to generate a unique number when the request enters the service and print it with every log statement, but this would be once again difficult to co-relate to the user

## Solution:

Another solution would be to print the user ID and request ID for every log statement. request ID would be generated on the client side. request ID is unique for every request from the user. It will help in identifying a request in case there is a concurrent requests from multiple users (As we have the user ID as well). These are passed as an HTTP header with each request and appended to each log line.

## Approach:

The MDC provides a simple key/value (map) mechanism to capture small amounts of custom diagnostic data. Since it’s built into the logging framework, it’s really easy to add values from the MDC to each log line. MDC is supported by log4j, log4j2, and SL4J/logback (What is use in MF).

MDC allows us to fill a map-like structure with pieces of information that are accessible to the appender when the log message is actually written. The MDC structure is internally attached to the executing thread in the same way a ThreadLocal variable would be.

## The high-level idea is:

- At the start of the thread, fill MDC with pieces of information that are required  to make available to the log appender
- Log the message

## Implementation:

My application stack : Java – Dropwizard
However, the idea behind this implementation holds good for any framework.

### A method interceptor for all the resource:

```
/**
 * @author adesh.nalpet
 * created on 20th December 2019
 * A resource method interceptor for adding request context to MDC (Logger)
 */
@Slf4j
public class RequestContextModule extends AbstractModule {

    @Override
    protected void configure() {
        final RequestContextInterceptor requestContextInterceptor = new RequestContextInterceptor();
        requestInjection(requestContextInterceptor);
        bindInterceptor(Matchers.any(), Matchers.annotatedWith(Path.class), requestContextInterceptor);
    }

    @VisibleForTesting
    public static class RequestContextInterceptor implements MethodInterceptor {

        @Override
        public Object invoke(MethodInvocation invocation) throws Throwable {

            /* Applicable for methods annotated with @Path (Resources) */
            final Optional<Annotation> optionalAnnotation = Stream.of(invocation.getMethod().getDeclaredAnnotations())
                    .filter(annotation -> annotation instanceof Path)
                    .findFirst();

            if (optionalAnnotation.isPresent()) {
                final Annotation[][] parameterAnnotations = invocation.getMethod().getParameterAnnotations();

                for (int index = 0; index < parameterAnnotations.length; ++index) {
                    for (final Annotation annotation : parameterAnnotations[index]) {
                        /* Check for method arguments annotated with @Auth */
                        if (annotation instanceof Auth) {
                            try {
                                final Auth auth = (Auth) invocation.getArguments()[index];
                                /* Add request and user ID to MDC
                                Note :
                                * Any information in Auth can be logged.
                                * Consider compliance restrictions before logging any sensitive information.
                                */
                                MDC.put(RequestContext.REQUEST_ID, auth.getRequestId());
                                MDC.put(RequestContext.REQUEST_USER_ID, auth.getUserId());
                            } catch (Exception e) {
                                /* Deliberately catching all exceptions,
                                to ensure application is not affected from logger
                                TODO : Set-up alerts for the below log */
                                log.error("[Auth to MDC] Error while fetching Auth");
                            }
                        }
                    }
                }
            }
            return invocation.proceed();
        }
    }
}
```

### Response filter to clear context:

```
/**
 * @author adesh.nalpet
 * created on 20th December 2019
 * A Servlet response filter to clear MDC.
 */
public class ClearContextResponseFilter implements Filter {
    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
        /* deliberately nothing */
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {
        try {
            chain.doFilter(request, response);
        } finally {
            RequestContext.clearContext();
        }
    }

    @Override
    public void destroy() {
        /* deliberately nothing */
    }
}
```

### Request Context:

```
/**
 * @author adesh.nalpet
 * created on 20th December 2019
 * TODO : Validate storing RequestContext in thread local.
 */
public class RequestContext {

    public static final String REQUEST_ID = "request_id";
    public static final String REQUEST_USER_ID = "user_id";

    public static void clearContext() {
        MDC.remove(REQUEST_ID);
        MDC.remove(REQUEST_USER_ID);
    }
}
```

## LogFormat:

logFormat: `"%(%-5level) [%date] %X{request_id} %X{user_id} [%thread] [%logger{0}]: %message%n"`
 