# GitHub Copilot Instructions for ha-calendar2image

## Project Overview
This is a Home Assistant Add-On that generates images from calendar data (ICS format) using customizable templates.

## Code Style and Conventions
- Use JavaScript ES6+ syntax
- Follow Home Assistant add-on best practices
- Ensure compatibility with Home Assistant's Docker environment
- Follow the KISS principle (Keep It Simple, Stupid)

## Key Architecture Points
- Calendar data is parsed from ICS format
- Image generation uses customizable templates
- Designed to run as a Home Assistant add-on, typically on a Raspberry Pi
- **Performance Critical**: Always optimize to continuously serve CRC32 & image downloads as fast as possible to minimize battery consumption of consuming ESP32 devices

## Testing Guidelines
- The project has automated tests; execute them before committing code
- All tests must pass before submitting changes

## Pull Request Checklist
When creating a PR, ensure you:
- Update the version in both `package.json` and `config.yaml`
- Update the CHANGELOG with your changes
- Review all `.md` files and update if needed