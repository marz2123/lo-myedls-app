import { SecuritySettings } from "./SecuritySettings";
import { DataExport } from "./DataExport";
import { Separator } from "@/components/ui/separator";

export const AccountDataSettings = () => {
  return (
    <div className="space-y-6">
      {/* Security Section */}
      <div>
        <SecuritySettings />
      </div>

      <Separator />

      {/* Data Export Section */}
      <div>
        <DataExport />
      </div>
    </div>
  );
};
