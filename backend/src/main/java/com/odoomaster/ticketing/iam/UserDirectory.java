package com.odoomaster.ticketing.iam;

import java.util.Optional;

/**
 * Published iam API for resolving user identities across module boundaries.
 *
 * <p>Consumers ({@code feedback}, {@code notification}) call this instead of reaching into iam's
 * {@code User} entity or its repository, so the user schema stays private to the module. Returns the
 * lightweight {@link UserRef} projection rather than the JPA entity.
 */
public interface UserDirectory {

    /**
     * Look up a user by id.
     *
     * @param userId the user to read
     * @return the reference, or {@link Optional#empty()} if not found
     */
    Optional<UserRef> find(Long userId);

    /**
     * Look up a user by email (unique).
     *
     * @param email the address to resolve
     * @return the reference, or {@link Optional#empty()} if not found
     */
    Optional<UserRef> findByEmail(String email);

    /**
     * Immutable projection of a {@code User} exposed across module boundaries.
     */
    record UserRef(Long id, String email) {}
}
