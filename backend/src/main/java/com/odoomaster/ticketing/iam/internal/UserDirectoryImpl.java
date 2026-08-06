package com.odoomaster.ticketing.iam.internal;

import com.odoomaster.ticketing.iam.UserDirectory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * iam-owned implementation of {@link UserDirectory}. Reads the {@code User}
 * aggregate and maps it to
 * the published {@link UserRef} projection so callers never touch the entity.
 */
@Service
@Transactional(readOnly = true)
public class UserDirectoryImpl implements UserDirectory {

  private final UserRepository users;

  public UserDirectoryImpl(UserRepository users) {
    this.users = users;
  }

  @Override
  public Optional<UserRef> find(Long userId) {
    return users.findById(userId).map(UserDirectoryImpl::toRef);
  }

  @Override
  public Optional<UserRef> findByEmail(String email) {
    return users.findByEmail(email).map(UserDirectoryImpl::toRef);
  }

  private static UserRef toRef(User u) {
    return new UserRef(u.getId(), u.getEmail());
  }
}
