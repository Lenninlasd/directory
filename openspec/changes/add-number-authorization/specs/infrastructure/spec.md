# Spec Delta

## ADDED Requirements

### Requirement: Owner contact values at build time
Each environment SHALL keep the administrator's WhatsApp number, the data controller's name, and the controller's email as plain SSM parameters under its own path, created by hand once. The deploy SHALL read them with the developer's credentials and pass them to the frontend build, and SHALL stop before changing anything when one is missing. The Lambda SHALL NOT read them.

#### Scenario: Parameters of an environment
- **WHEN** the owner contact values of an environment are inspected
- **THEN** they are the SSM `String` parameters `/alameda/<env>/admin-whatsapp-number`, `/alameda/<env>/data-controller-name`, and `/alameda/<env>/data-controller-email`

#### Scenario: A deploy
- **WHEN** the deploy command builds the frontend of an environment
- **THEN** the build receives that environment's three values together with `VITE_API_BASE_URL`

#### Scenario: A missing parameter
- **WHEN** one of the three parameters does not exist or is empty in the environment being deployed
- **THEN** the deploy stops before the backend deploy with a message naming the parameter, and nothing in that environment is changed

#### Scenario: Not in the repository or the Lambda
- **WHEN** the repository, the template, and the Lambda role and environment variables are inspected
- **THEN** none contains the three values or a permission to read them
