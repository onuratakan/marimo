/* Copyright 2024 Marimo. All rights reserved. */
import { z } from "zod";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";

import { cn } from "@/utils/cn";
import { IPlugin, IPluginProps, Setter } from "../types";
import { filesToBase64 } from "../../utils/fileToBase64";
import { buttonVariants } from "../../components/ui/button";
import { renderHTML } from "../core/RenderHTML";

type FileUploadType = "button" | "area";

/**
 * Arguments for a file upload area/button
 *
 * @param filetypes - file types to accept (same as HTML input's accept attr)
 * @param multiple - whether to allow the user to upload multiple files
 * @param label - a label for the file upload area
 */
interface Data {
  filetypes: string[];
  multiple: boolean;
  kind: FileUploadType;
  label: string | null;
}

type T = Array<[string, string]>;

export class FileUploadPlugin implements IPlugin<T, Data> {
  tagName = "marimo-file";

  validator = z.object({
    filetypes: z.array(z.string()),
    multiple: z.boolean(),
    kind: z.enum(["button", "area"]),
    label: z.string().nullable(),
  });

  render(props: IPluginProps<T, Data>): JSX.Element {
    return (
      <FileUpload
        label={props.data.label}
        filetypes={props.data.filetypes}
        multiple={props.data.multiple}
        kind={props.data.kind}
        value={props.value}
        setValue={props.setValue}
      />
    );
  }
}

/**
 * @param value - array of (filename, filecontents) tuples; filecontents should
 *                be b64 encoded.
 * @param setValue - communicate file upload
 */
interface FileUploadProps extends Data {
  value: T;
  setValue: Setter<T>;
}

function groupFileTypesByMIMEType(extensions: string[]) {
  const filesByMIMEType: Record<string, string[]> = {};

  const appendExt = (mimetype: string, extension: string) => {
    if (Object.hasOwnProperty.call(filesByMIMEType, mimetype)) {
      filesByMIMEType[mimetype].push(extension);
    } else {
      filesByMIMEType[mimetype] = [extension];
    }
  };

  extensions.forEach((extension) => {
    switch (extension) {
      case ".png":
      case ".jpg":
      case ".jpeg":
      case ".gif":
      case ".avif":
      case ".bmp":
      case ".ico":
      case ".svg":
      case ".tiff":
      case ".webp":
        appendExt("image/*", extension);
        break;
      case ".avi":
      case ".mp4":
      case ".mpeg":
      case ".ogg":
      case ".webm":
        appendExt("video/*", extension);
        break;
      case ".pdf":
        appendExt("application/pdf", extension);
        break;
      case ".csv":
        appendExt("text/csv", extension);
        break;
      default:
        appendExt("text/plain", extension);
    }
  });

  return filesByMIMEType;
}

/* TODO(akshayka): Allow uploading files one-by-one and removing uploaded files
 * when multiple is `True`*/
export const FileUpload = (props: FileUploadProps): JSX.Element => {
  const acceptGroups = groupFileTypesByMIMEType(props.filetypes);
  const { setValue, kind, multiple, value } = props;
  const { getRootProps, getInputProps, isFocused, isDragAccept, isDragReject } =
    useDropzone({
      accept: acceptGroups,
      multiple: multiple,
      onDrop: (acceptedFiles) => {
        filesToBase64(acceptedFiles).then((value) => {
          setValue(value);
        });
      },
    });

  if (kind === "button") {
    // TODO(akshayka): React to a change in `value` due to an update from another
    // instance of this element. Browsers do not allow scripts to set the `value`
    // on a file input element.
    // One way to do this:
    // - hide the input element with a hidden attribute
    // - create a button and some text that reflects what has been uploaded;
    //   link button to the hidden input element
    const label = props.label ?? "<p>Upload</p>";
    return (
      <>
        <button
          {...getRootProps({})}
          className={buttonVariants({
            variant: "secondary",
            size: "xs",
          })}
        >
          {renderHTML({ html: label })}
          <Upload size={16} className="ml-2" />
        </button>
        <input {...getInputProps({})} type="file" />
      </>
    );
  }

  const uploadedFiles = value.map(([fileName, _]) => (
    <li key={fileName}>{fileName}</li>
  ));

  const uploaded = uploadedFiles.length > 0;
  const label =
    props.label ?? "Drag and drop files here, or click to open file browser";
  return (
    <section>
      <div
        className={cn(
          "mt-3 mb-2 w-full flex flex-col items-center justify-center ",
          "px-6 py-6 sm:px-8 sm:py-8 md:py-10 md:px-16",
          "border rounded-sm",
          "text-sm text-muted-foreground",
          "shadow-smSolid",
          "hover:bg-muted/60",
          "hover:cursor-pointer",
          "active:shadow-xsSolid",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-accent",
          !isFocused && "bg-muted border-input/60",
          isFocused && "bg-muted/60 border-accent/40",
          isDragAccept && "bg-muted/60 border-accent/40 shadow-xsSolid",
          isDragReject && "bg-muted/60 border-destructive/60 shadow-xsSolid"
        )}
        {...getRootProps()}
      >
        <input {...getInputProps()} />
        {uploaded ? (
          <span>To re-upload: {renderHTML({ html: label })}</span>
        ) : (
          <span className="mt-0">{renderHTML({ html: label })}</span>
        )}
      </div>

      <aside>
        {uploaded ? (
          <span className="markdown">
            <strong>Uploaded files</strong>
            <ul style={{ margin: 0 }}>{uploadedFiles}</ul>
          </span>
        ) : null}
      </aside>
    </section>
  );
};
