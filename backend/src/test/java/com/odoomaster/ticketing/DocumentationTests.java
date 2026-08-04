package com.odoomaster.ticketing;

import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;
import org.springframework.modulith.docs.Documenter;

/**
 * Regenerates the Spring Modulith documentation from the live module model:
 * a C4 component diagram of the whole system, one component diagram per module,
 * and a "module canvas" (AsciiDoc) summarising each module's dependencies and
 * published API.
 *
 * <p>Output lands in {@code target/spring-modulith-docs} (Documenter's default).
 * The committed snapshot under {@code docs/architecture/modulith/} is refreshed by
 * copying that folder's {@code *.puml} / {@code *.adoc} across — see the README there.
 * Kept as a test so the docs are always reproducible from a plain {@code mvn test}.
 */
class DocumentationTests {

    @Test
    void writesModuleDocumentation() {
        ApplicationModules modules = ApplicationModules.of(Application.class);
        new Documenter(modules)
                .writeModulesAsPlantUml()          // system-wide C4 component diagram
                .writeIndividualModulesAsPlantUml() // one component diagram per module
                .writeModuleCanvases();             // per-module canvas (deps + exposed API)
    }
}
