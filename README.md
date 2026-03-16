# Fleet Hub

Fleet management and live vehicle tracking application.

## Getting Started

```bash
# Install frontend dependencies
npm install

# Install server dependencies
cd server && npm install

# Start the backend server
cd server && npm run dev

# Start the frontend (separate terminal)
npm run dev
```

## Login Credentials

| Username | Password    | Role   | Access                                   |
|----------|-------------|--------|------------------------------------------|
| admin    | admin123    | Admin  | Full access — add/edit/delete vehicles, manage images, all settings |
| faizan   | driver123   | Driver | View map & fleet, select a car to drive  |
| ali      | driver123   | Driver | View map & fleet, select a car to drive  |
| adam     | driver123   | Driver | View map & fleet, select a car to drive  |
| fivos    | driver123   | Driver | View map & fleet, select a car to drive  |
| aris     | driver123   | Driver | View map & fleet, select a car to drive  |
| panos    | driver123   | Driver | View map & fleet, select a car to drive  |
| ar       | driver123   | Driver | View map & fleet, select a car to drive  |

### How it works

1. Open the app and sign in with one of the accounts above
2. After login, select which car you are driving
3. If someone else is already driving a car, their name is shown — clicking it overrides and assigns it to you
4. Admin can skip car selection
5. Drivers have read-only access to fleet (no add/edit/delete)
whe