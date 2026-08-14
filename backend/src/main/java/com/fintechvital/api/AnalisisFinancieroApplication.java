package com.fintechvital.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@ComponentScan(basePackages = "com.fintechvital.api")
@EnableJpaRepositories(basePackages = "com.fintechvital.api.repository")
@EntityScan(basePackages = "com.fintechvital.api.model")
public class AnalisisFinancieroApplication {

    public static void main(String[] args) {
        SpringApplication.run(AnalisisFinancieroApplication.class, args);
    }
}