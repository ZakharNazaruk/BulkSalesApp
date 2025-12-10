package com.bulksales.notification.config;

import feign.Logger;
import feign.Request;
import feign.Response;
import org.slf4j.LoggerFactory;

import java.io.IOException;

public class OneLineFeignLogger extends Logger {

    private static final org.slf4j.Logger log = LoggerFactory.getLogger(OneLineFeignLogger.class);

    @Override
    protected void log(String configKey, String format, Object... args) {
        log.info(String.format(methodTag(configKey) + format, args));
    }

    @Override
    protected void logRequest(String configKey, Level logLevel, Request request) {
        if (logLevel.ordinal() >= Level.BASIC.ordinal()) {
            log.info("FeignRequest: {} {} {}", request.httpMethod(), request.url(), request.headers());
        }
    }

    @Override
    protected Response logAndRebufferResponse(String configKey, Level logLevel, Response response, long elapsedTime) throws IOException {
        if (logLevel.ordinal() >= Level.BASIC.ordinal()) {
            int status = response.status();
            log.info("FeignResponse: {} {} in {}ms", response.request().httpMethod(), response.request().url(), elapsedTime);
        }
        return response;
    }
}
