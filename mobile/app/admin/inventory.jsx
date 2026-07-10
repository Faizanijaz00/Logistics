import { Package } from 'lucide-react-native';
import ChecklistFeature from '../../src/components/ChecklistFeature';
import { useInventoryStore } from '../../src/store/checklistStores';

export default function InventoryScreen() {
  return (
    <ChecklistFeature
      store={useInventoryStore}
      title="Inventory"
      emptyIcon={Package}
      itemNoun="inventory item"
      perCar
      showImport
    />
  );
}
