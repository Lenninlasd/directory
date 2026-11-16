# Spec Delta

## ADDED Requirements

### Requirement: Add business form address at build time
Each environment SHALL keep the add business form address as the plain SSM parameter `/alameda/<env>/add-business-form-url`, created by hand once. The deploy SHALL read it together with the values of "Owner contact values at build time", pass it to the frontend build, and stop before changing anything when it is missing. The Lambda SHALL NOT read it.

#### Scenario: A deploy
- **WHEN** the deploy command builds the frontend of an environment
- **THEN** the build receives that environment's form address together with the other owner contact values and `VITE_API_BASE_URL`

#### Scenario: A missing parameter
- **WHEN** `/alameda/<env>/add-business-form-url` does not exist or is empty in the environment being deployed
- **THEN** the deploy stops before the backend deploy with a message naming the parameter, and nothing in that environment is changed

#### Scenario: One form per environment
- **WHEN** the parameters of `dev` and `prod` are compared
- **THEN** each holds the address of its own form, and the `dev` form links the `dev` policy page
