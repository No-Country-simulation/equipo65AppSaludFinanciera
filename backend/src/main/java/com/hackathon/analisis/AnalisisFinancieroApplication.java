package com.hackathon.analisis;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@ComponentScan(basePackages = "com.hackathon.analisis")
@EnableJpaRepositories(basePackages = "com.hackathon.analisis.repository")
@EntityScan(basePackages = "com.hackathon.analisis.model")
public class AnalisisFinancieroApplication {

    public static void main(String[] args) {
        SpringApplication.run(AnalisisFinancieroApplication.class, args);
    }
}