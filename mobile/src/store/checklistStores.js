// Concrete Maintenance & Inventory checklist stores, generated from the shared
// factory. Both expose the same API (fetchOverview, fetchItems, startCheck, …).
import { createChecklistStore } from './createChecklistStore';

export const useMaintenanceStore = createChecklistStore('/api/maintenance');
export const useInventoryStore = createChecklistStore('/api/inventory');
