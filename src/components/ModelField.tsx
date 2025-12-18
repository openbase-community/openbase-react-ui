import { Badge } from "@/components/ui/badge";

interface ModelFieldProps {
  field: {
    name: string;
    type: string;
    kwargs: Record<string, any>;
    choices?: [string, string][];
  };
  serializers: Array<{ name: string }>;
}

const FIELD_TYPE_MAPPING: Record<string, string> = {
  "models.CharField": "Text Field",
  "models.TextField": "Long Text Field",
  "models.BooleanField": "Boolean Field",
  "models.DateTimeField": "Date & Time Field",
  "models.DateField": "Date Field",
  "models.TimeField": "Time Field",
  "models.IntegerField": "Integer Field",
  "models.FloatField": "Decimal Field",
  "models.EmailField": "Email Field",
  "models.URLField": "URL Field",
  "models.SlugField": "Slug Field",
  "models.UUIDField": "UUID Field",
  "models.ForeignKey": "Foreign Key",
  "models.OneToOneField": "One-to-One Relationship",
  "models.ManyToManyField": "Many-to-Many Relationship",
  "models.JSONField": "JSON Field",
  "models.ImageField": "Image Field",
  "models.FileField": "File Field",
  "models.PositiveIntegerField": "Positive Integer Field",
  "models.BigIntegerField": "Big Integer Field",
  "models.DecimalField": "Decimal Field",
};

const KWARG_DESCRIPTIONS: Record<string, string> = {
  max_length: "Maximum Length",
  unique: "Must be Unique",
  blank: "Can be Empty",
  null: "Can be Null",
  default: "Default Value",
  auto_now_add: "Set on Creation",
  auto_now: "Update on Save",
  on_delete: "Delete Behavior",
  related_name: "Related Name",
  verbose_name: "Display Name",
  help_text: "Help Text",
  db_index: "Database Index",
  editable: "User Editable",
  choices: "Available Choices",
  upload_to: "Upload Path",
  max_digits: "Maximum Digits",
  decimal_places: "Decimal Places",
};

export const ModelField = ({ field, serializers }: ModelFieldProps) => {
  const getHumanFriendlyType = (type: string) => {
    return FIELD_TYPE_MAPPING[type] || type.replace("models.", "");
  };

  const formatKwargValue = (key: string, value: any) => {
    if (key !== "default" && typeof value === "boolean") {
      return value ? "Yes" : "No";
    }
    if (typeof value === "string") {
      return `"${value}"`;
    }
    if (key === "on_delete" && typeof value === "string") {
      return value.replace("models.", "");
    }
    return String(value);
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="font-semibold text-lg">{field.name}</h4>
            <Badge variant="outline" className="text-xs">
              {getHumanFriendlyType(field.type)}
            </Badge>
          </div>

          {Object.keys(field.kwargs).length > 0 && (
            <div className="space-y-1">
              {Object.entries(field.kwargs).map(([key, value]) => (
                <div key={key} className="text-sm text-muted-foreground">
                  <span className="font-medium">
                    {KWARG_DESCRIPTIONS[key] || key}:
                  </span>{" "}
                  <span>{formatKwargValue(key, value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1 ml-4">
          {serializers.map((serializer) => (
            <Badge
              key={`${serializer.name}-${field.name}`}
              variant="secondary"
              className="text-xs"
            >
              Serializer: {serializer.name}
            </Badge>
          ))}
        </div>
      </div>

      {field.choices && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-sm font-medium mb-2">Available Choices:</p>
          <div className="flex flex-wrap gap-1">
            {field.choices.map(([value, label]) => (
              <Badge key={value} variant="outline" className="text-xs">
                {value}: {label}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
