/** temporary file until the feature is finished */

interface ManifestArgumentBase {
  name: string;
  description: string;
  required?: boolean;
}

export interface ManifestEnumArgument<T extends string = string>
  extends ManifestArgumentBase {
  type: "enum";
  /* to be selected on UI */
  default?: T;
  options: T[];
}

export interface ManifestStringArgument extends ManifestArgumentBase {
  type: "string";
  /* to be selected on UI */
  default?: string;
}

export interface ManifestNumberArgument extends ManifestArgumentBase {
  type: "number";
  /* to be selected on UI */
  default?: number;
}

export interface ManifestBooleanArgument extends ManifestArgumentBase {
  type: "boolean";
  /* to be selected on UI */
  default?: boolean;
}

export type ManifestArgument =
  | ManifestEnumArgument
  | ManifestBooleanArgument
  | ManifestNumberArgument
  | ManifestStringArgument;

export interface ManifestDataset {
  id: string;
  datasetName: string;
}

export interface ManifestCollection {
  id: string;
  datasetId: string;
  filters: Record<string, string>;
}

export interface AndCondition {
  and: AnyCondition[];
}

export interface OrCondition {
  or: AnyCondition[];
}

export interface NotCondition {
  not: AnyCondition;
}

export interface EqualCondition {
  equal: string;
  value: string;
}

export type SimpleTrueCodition = string;

export type AnyCondition =
  | AndCondition
  | OrCondition
  | NotCondition
  | EqualCondition
  | SimpleTrueCodition;

export interface ManifestInputLayer {
  id: string;
  label: string;
  description: string;
  collectionId: string;
  scale?: number;
  conditions?: AnyCondition;
}

export interface ManifestOutputLayer {
  id: string;
  label: string;
  required: boolean;
  description: string;
}

export interface ManifestModule {
  id?: string;
  title: string;
  arguments?: ManifestArgument[];
  datasets: ManifestDataset[];
  collections: ManifestCollection[];
  inputLayers: ManifestInputLayer[];
  outputLayers: ManifestOutputLayer[];
}

export interface Manifest {
  module: ManifestModule;
}

const manifest: Manifest = {
  module: {
    title: "test",
    datasets: [{ datasetName: "tes", id: "id" }],
    collections: [{ datasetId: "id", id: "c1", filters: {} }],
    arguments: [
      {
        name: "arg1",
        description: "test",
        type: "enum",
        options: ["1", "2"],
        default: "1",
      },
    ],
    inputLayers: [
      {
        id: "stb1",
        collectionId: "c1",
        description: "ster",
        label: "stb1",
        scale: 0.1,
        conditions: {
          or: [
            "test",
            { not: "args.123" },
            {
              equal: "a",
              value: "123",
            },
          ],
        },
      },
    ],
    outputLayers: [
      {
        id: "out",
        label: "out",
        description: "main output",
        required: true,
      },
    ],
  },
};
console.log(manifest);
