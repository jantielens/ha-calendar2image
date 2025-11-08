## Description
<!-- Provide a brief description of your changes -->

## Type of Change
<!-- Please delete options that are not relevant -->
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Performance improvement
- [ ] Documentation update

## Checklist
<!-- Please ensure all items are checked before submitting the PR -->

### Version and Documentation
- [ ] Updated version in `package.json`
- [ ] Updated version in `config.yaml`
- [ ] Updated `CHANGELOG` with changes
- [ ] Reviewed and updated all `.md` files if needed

### Code Quality
- [ ] Code follows ES6+ JavaScript syntax
- [ ] Code follows Home Assistant add-on best practices
- [ ] Code is compatible with Home Assistant's Docker environment
- [ ] Code follows the KISS principle (Keep It Simple, Stupid)

### Performance
- [ ] Changes are optimized for fast CRC32 & image downloads (critical for ESP32 battery consumption)
- [ ] No unnecessary performance bottlenecks introduced

### Testing
- [ ] All automated tests pass
- [ ] Tested in a Home Assistant environment (if applicable)
- [ ] Tested with ICS calendar data (if applicable)

## Related Issues
<!-- Link any related issues here using #issue_number -->
Fixes #

## Additional Notes
<!-- Add any additional information that reviewers should know -->
