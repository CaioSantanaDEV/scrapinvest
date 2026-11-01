# =========================================================================
# Multi-Stage Dockerfile para Spring Boot (ScrapInvest Backend)
# =========================================================================

# Estágio 1: Build da aplicação com Maven e JDK 21
FROM maven:3.9.8-eclipse-temurin-21 AS build
WORKDIR /app

# Cache de dependências para agilizar builds incrementais
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copia código-fonte e compila o pacote JAR
COPY src ./src
RUN mvn clean package -DskipTests

# Estágio 2: Imagem final de execução (JRE 21 Alpine ultraleve)
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Usuário de sistema sem privilégios de root por segurança
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Copia apenas o artefato gerado no primeiro estágio
COPY --from=build --chown=spring:spring /app/target/*.jar app.jar

# Porta padrão da API
EXPOSE 8080

# Otimizações de JVM para contêineres Docker
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Djava.security.egd=file:/dev/./urandom"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
