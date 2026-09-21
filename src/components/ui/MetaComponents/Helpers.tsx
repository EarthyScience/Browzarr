export function renderAttributes(
  data: Record<string, any> = {},
  defaultAttributes: string[] = []
): React.ReactNode {
  const keys = Object.keys(data);
  if (keys.length === 0) return [];
  // Order default attributes first
  const orderedKeys = [
    ...defaultAttributes.filter((key) => key in data),
    ...Object.keys(data).filter((key) => !defaultAttributes.includes(key)),
  ];

  return orderedKeys.map((key) => {
    const value = data[key];
    const isDefault = defaultAttributes.includes(key);
    return (
      <div key={key}>
        <div
          className={`font-mono ${
            isDefault ? 'font-semibold' : 'text-[var(--muted-foreground)]'
          }`}
        >
          {key}:
        </div>
        <div className="font-mono whitespace-pre-wrap break-words md:col-start-2 md:row-start-auto pl-4 md:pl-2"
          style={{ overflowWrap: 'anywhere' }}
        >
          {typeof value === 'object'
            ? JSON.stringify(value, (_key, val) =>
              typeof val === 'bigint' ? parseInt(val.toString()) : val)
            : String(value)
            }
        </div>
      </div>
    );
  });
}

export const defaultAttributes = [
    "long_name",
    "description",
    "units",
    "_ARRAY_DIMENSIONS"
]