package com.odoomaster.ticketing;

import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;

/**
 * Verifies the Spring Modulith module model derived from {@link Application}:
 * every capability module keeps its {@code …internal} types private, only reaches
 * modules it declares in {@code @ApplicationModule(allowedDependencies = …)}, and the
 * whole dependency graph stays acyclic. Pure static classpath analysis — no Spring
 * context or datasource is booted, so it runs in a plain {@code mvn test}.
 */
class ModularityTests {

    private static final ApplicationModules MODULES = ApplicationModules.of(Application.class);

    @Test
    void verifiesModuleBoundaries() {
        MODULES.verify();
    }
}
