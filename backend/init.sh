#!/bin/bash

# ===== CONFIG =====
PROJECT_NAME="event-ticketing-system"
BASE_PACKAGE="com.odoomaster.ticketing"
SPRING_BOOT_VERSION="3.2.5"

# ===== CREATE MAVEN STRUCTURE =====
mkdir -p src/main/java/$(echo $BASE_PACKAGE | tr '.' '/')
mkdir -p src/main/resources
mkdir -p src/test/java/$(echo $BASE_PACKAGE | tr '.' '/')

BASE_DIR="src/main/java/$(echo $BASE_PACKAGE | tr '.' '/')"

# ===== CREATE LAYERS =====
mkdir -p $BASE_DIR/{controller,service,repository,domain,dto,config,exception,security,util}

# ===== MAIN APPLICATION =====
cat <<EOL >$BASE_DIR/Application.java
package $BASE_PACKAGE;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
EOL

# ===== APPLICATION.YML =====
cat <<EOL >src/main/resources/application.yml
server:
  port: 8080

spring:
  application:
    name: event-ticketing-system

  datasource:
    url: jdbc:mysql://db:3306/ticketing?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
    username: root
    password: root

  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true
    properties:
      hibernate:
        format_sql: true

  devtools:
    restart:
      enabled: true

logging:
  level:
    org.springframework: INFO
EOL

# ===== POM.XML =====
cat <<EOL >pom.xml
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         http://www.w3.org/xsd/maven-4.0.0.xsd">

    <modelVersion>4.0.0</modelVersion>

    <groupId>com.dede</groupId>
    <artifactId>ticketing</artifactId>
    <version>0.0.1-SNAPSHOT</version>

    <properties>
        <java.version>17</java.version>
        <spring.boot.version>$SPRING_BOOT_VERSION</spring.boot.version>
    </properties>

    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-dependencies</artifactId>
                <version>\${spring.boot.version}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
        </dependencies>
    </dependencyManagement>

    <dependencies>

        <!-- Web -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>

        <!-- JPA -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>

        <!-- Security -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>

        <!-- MySQL -->
        <dependency>
            <groupId>com.mysql</groupId>
            <artifactId>mysql-connector-j</artifactId>
        </dependency>

        <!-- DevTools (HOT RELOAD) -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-devtools</artifactId>
        </dependency>

        <!-- Lombok -->
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>

        <!-- Validation -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>

        <!-- Test -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
        </dependency>

    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>

</project>
EOL

# ===== DOCKERFILE (PROD) =====
cat <<EOL >Dockerfile
FROM openjdk:17-jdk-slim

WORKDIR /app

COPY target/ticketing-0.0.1-SNAPSHOT.jar app.jar

ENTRYPOINT ["java", "-jar", "app.jar"]
EOL

# ===== DOCKERFILE DEV =====
cat <<EOL >Dockerfile.dev
FROM maven:3.9.6-eclipse-temurin-17

WORKDIR /app

COPY . .

CMD ["mvn", "spring-boot:run"]
EOL

# ===== DOCKER COMPOSE DEV (HOT RELOAD) =====
cat <<EOL >docker-compose.dev.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    volumes:
      - .:/app
      - ~/.m2:/root/.m2
    ports:
      - "8080:8080"
    depends_on:
      - db
    environment:
      SPRING_DEVTOOLS_RESTART_ENABLED: "true"

  db:
    image: mysql:8
    restart: always
    environment:
      MYSQL_DATABASE: ticketing
      MYSQL_ROOT_PASSWORD: root
    ports:
      - "3306:3306"
EOL

# ===== DOCKER COMPOSE PROD =====
cat <<EOL >docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8080:8080"
    depends_on:
      - db

  db:
    image: mysql:8
    restart: always
    environment:
      MYSQL_DATABASE: ticketing
      MYSQL_ROOT_PASSWORD: root
    ports:
      - "3306:3306"
EOL

echo "✅ Project created with MySQL + Hot Reload!"
echo ""
echo "👉 DEV mode (hot reload):"
echo "   docker-compose -f docker-compose.dev.yml up"
echo ""
echo "👉 PROD mode:"
echo "   mvn clean package"
echo "   docker-compose up --build"
