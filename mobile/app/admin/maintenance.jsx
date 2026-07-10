import { Wrench } from 'lucide-react-native';
import ChecklistFeature from '../../src/components/ChecklistFeature';
import { useMaintenanceStore } from '../../src/store/checklistStores';

export default function MaintenanceScreen() {
  return (
    <ChecklistFeature
      store={useMaintenanceStore}
      title="Maintenance Checks"
      emptyIcon={Wrench}
      itemNoun="checklist item"
    />
  );
}
