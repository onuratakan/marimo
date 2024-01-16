/* Copyright 2023 Marimo. All rights reserved. */
import { PrimitiveType, Schema } from "compassql/build/src/schema";
import React from "react";
import { Label } from "@/components/ui/label";
import { PRIMITIVE_TYPE_ICON } from "./icons";
import { useAtomValue } from "jotai";
import { chartSpecAtom, useChartSpecActions } from "../state/reducer";
import { EncodingChannel, FieldDefinition } from "../encoding";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MULTI_TEMPORAL_FUNCTIONS,
  QUANTITATIVE_FUNCTIONS,
  SINGLE_TEMPORAL_FUNCTIONS,
} from "../functions/function";
import { FieldFunction } from "../functions/types";
import { FunctionSquareIcon } from "lucide-react";
import { startCase } from "lodash-es";
import { ExpandedType } from "compassql/build/src/query/expandedtype";
import { MARKS, SpecMark } from "../marks";
import { SHORT_WILDCARD } from "compassql/build/src/wildcard";

interface Props {
  schema: Schema;
  mark: SpecMark;
}

const ENCODINGS: Array<EncodingChannel | "DIVIDER"> = [
  "x",
  "y",
  "DIVIDER",
  "color",
  "size",
  "shape",
  "DIVIDER",
  "row",
  "column",
];

/**
 * Query form component that allows users to select encodings
 * for the chart spec.
 */
export const QueryForm: React.FC<Props> = ({ schema, mark }) => {
  const value = useAtomValue(chartSpecAtom);
  const actions = useChartSpecActions();
  return (
    <div className="grid gap-x-2 gap-y-4 justify-items-start p-2 bg-[var(--slate-1)] border rounded items-center grid-template-columns-[repeat(2,_minmax(0,_min-content))] self-start">
      <span className="col-span-2 flex items-center justify-between w-full">
        <div className="text-lg font-semibold">Encodings</div>
        <Select
          value={mark.toString()}
          onValueChange={(value) => actions.setMark(value as SpecMark)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Mark" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Mark</SelectLabel>
              {MARKS.map((mark) => (
                <SelectItem key={mark} value={mark}>
                  {mark === SHORT_WILDCARD ? "auto" : mark}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </span>
      {ENCODINGS.map((channel, idx) => {
        if (channel === "DIVIDER") {
          return (
            <hr
              key={`${channel}-${idx}`}
              className="border-gray-200 w-full col-span-2"
            />
          );
        }

        return (
          <FieldSelect
            key={channel}
            schema={schema}
            label={channel}
            fieldDefinition={value.encoding[channel]}
            onChange={(value) => actions.setEncoding({ [channel]: value })}
          />
        );
      })}
    </div>
  );
};

/**
 * Select dropdown to choose a field
 */
const FieldSelect = ({
  label,
  schema,
  fieldDefinition,
  onChange,
}: {
  label: string;
  schema: Schema;
  fieldDefinition: FieldDefinition | undefined;
  onChange: (def: FieldDefinition | undefined) => void;
}) => {
  const renderValue = () => {
    if (!fieldDefinition) {
      return "--";
    }

    if (fieldDefinition.field === "*") {
      return (
        <span className="flex gap-2 flex-1">
          {PRIMITIVE_TYPE_ICON[PrimitiveType.NUMBER]}
          <span className="text-left flex-1">Count</span>
        </span>
      );
    }

    const field = fieldDefinition.field.toString();
    const renderLabel = () => {
      if (fieldDefinition.fn) {
        return `${fieldDefinition.fn}(${fieldDefinition.field})`;
      }

      return field;
    };

    return (
      <span className="flex gap-2 flex-1">
        {PRIMITIVE_TYPE_ICON[schema.primitiveType(field)]}
        <span className="text-left flex-1">{renderLabel()}</span>
      </span>
    );
  };

  const clear = () => {
    onChange(undefined);
  };

  const field = fieldDefinition?.field.toString() ?? "";

  return (
    <>
      <Label className="text-[var(--slate-11)] font-semibold">{label}</Label>
      <div className="flex flex-row gap-1 h-[26px]">
        <Select
          value={field}
          onValueChange={(value) => {
            if (value === "*") {
              onChange({
                field: "*",
                fn: "count",
                type: "quantitative",
              });
            } else {
              onChange({
                field: value,
                type: schema.vlType(value),
              });
            }
          }}
        >
          <SelectTrigger
            className="min-w-[210px] h-full"
            onClear={field ? clear : undefined}
          >
            {renderValue()}
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {schema.fieldNames().map((name) => {
                return (
                  <SelectItem key={name} value={name.toString()}>
                    <span className="flex items-center gap-2 flex-1">
                      {PRIMITIVE_TYPE_ICON[schema.primitiveType(name)]}
                      <span className="flex-1">{name}</span>
                      <span className="text-muted-foreground text-xs font-semibold">
                        ({schema.vlType(name)})
                      </span>
                    </span>
                  </SelectItem>
                );
              })}
              {schema.fieldNames().length === 0 && (
                <SelectItem disabled={true} value="--">
                  No columns
                </SelectItem>
              )}
              <SelectSeparator />
              <SelectItem key={"*"} value={"*"}>
                <span className="flex items-center gap-1 flex-1">
                  {PRIMITIVE_TYPE_ICON[PrimitiveType.NUMBER]}
                  <span className="flex-1">Count</span>
                </span>
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <div className="w-[26px]">
          {fieldDefinition && (
            <FieldOptions field={fieldDefinition} onChange={onChange} />
          )}
        </div>
      </div>
    </>
  );
};

const NONE_FN = "__";

/**
 * Field options. Currently only changes the fields aggregate/time functions.
 */
const FieldOptions = ({
  field,
  onChange,
}: {
  field: FieldDefinition;
  onChange: (def: FieldDefinition | undefined) => void;
}) => {
  if (field.field === "*") {
    return null;
  }

  let options: Array<[string, FieldFunction[]]> = [];

  if (field.type === ExpandedType.QUANTITATIVE) {
    options = [["", QUANTITATIVE_FUNCTIONS]];
  }

  if (field.type === ExpandedType.TEMPORAL) {
    options = [
      ["Single", SINGLE_TEMPORAL_FUNCTIONS],
      ["Multi", MULTI_TEMPORAL_FUNCTIONS],
    ];
  }

  if (options.length > 0) {
    return (
      <Select
        value={field.fn}
        onValueChange={(value) => {
          onChange({
            ...field,
            fn: value === NONE_FN ? undefined : (value as FieldFunction),
          });
        }}
      >
        <SelectTrigger
          className="h-full px-1"
          hideChevron={true}
          variant="ghost"
        >
          <FunctionSquareIcon size={14} strokeWidth={1.5} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value={NONE_FN}>None</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          {options.map(([label, fns]) => {
            return (
              <SelectGroup key={label}>
                {label && <SelectLabel>{label}</SelectLabel>}
                {fns.map((fn) => (
                  <SelectItem key={fn} value={fn ?? NONE_FN}>
                    {startCase(fn)}
                  </SelectItem>
                ))}
              </SelectGroup>
            );
          })}
        </SelectContent>
      </Select>
    );
  }

  return null;
};
