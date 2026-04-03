"use client";

import {
  type ChangeEvent,
  type DragEvent,
  type InputHTMLAttributes,
  useCallback,
  useRef,
  useState,
} from "react";

interface FileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

interface FileWithPreview {
  file: File | FileMetadata;
  id: string;
  preview?: string;
}

interface FileUploadOptions {
  accept?: string;
  initialFiles?: FileMetadata[];
  maxFiles?: number;
  maxSize?: number;
  multiple?: boolean;
  onFilesAdded?: (addedFiles: FileWithPreview[]) => void;
  onFilesChange?: (files: FileWithPreview[]) => void;
}

interface FileUploadState {
  errors: string[];
  files: FileWithPreview[];
  isDragging: boolean;
}

interface FileUploadActions {
  addFiles: (files: FileList | File[]) => void;
  clearErrors: () => void;
  clearFiles: () => void;
  getInputProps: (
    props?: InputHTMLAttributes<HTMLInputElement>
  ) => InputHTMLAttributes<HTMLInputElement> & {
    // biome-ignore lint/suspicious/noExplicitAny: cross-package ref compatibility
    ref: any;
  };
  handleDragEnter: (e: DragEvent<HTMLElement>) => void;
  handleDragLeave: (e: DragEvent<HTMLElement>) => void;
  handleDragOver: (e: DragEvent<HTMLElement>) => void;
  handleDrop: (e: DragEvent<HTMLElement>) => void;
  handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  openFileDialog: () => void;
  removeFile: (id: string) => void;
}

const DEFAULT_MAX_FILES = Number.POSITIVE_INFINITY;
const DEFAULT_MAX_SIZE = Number.POSITIVE_INFINITY;

const formatAcceptedTypes = (accept: string) =>
  accept
    .split(",")
    .map((type) => type.trim())
    .filter(Boolean);

const matchesAcceptedType = (
  acceptedTypes: string[],
  file: File | FileMetadata
) => {
  if (acceptedTypes.length === 0 || acceptedTypes.includes("*")) {
    return true;
  }

  const fileType = file.type;
  const fileExtension = `.${file.name.split(".").pop() ?? ""}`.toLowerCase();

  return acceptedTypes.some((type) => {
    if (type.startsWith(".")) {
      return fileExtension === type.toLowerCase();
    }

    if (type.endsWith("/*")) {
      const [baseType] = type.split("/");
      return fileType.startsWith(`${baseType}/`);
    }

    return fileType === type;
  });
};

const createFileId = (file: File | FileMetadata) => {
  if (file instanceof File) {
    return `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  return file.id;
};

const createFilePreview = (file: File | FileMetadata) => {
  if (file instanceof File) {
    return URL.createObjectURL(file);
  }

  return file.url;
};

const revokeFilePreview = (file: FileWithPreview) => {
  if (
    file.preview &&
    file.file instanceof File &&
    file.file.type.startsWith("image/")
  ) {
    URL.revokeObjectURL(file.preview);
  }
};

const buildFileError = (
  file: File | FileMetadata,
  acceptedTypes: string[],
  maxSize: number
) => {
  if (file.size > maxSize) {
    return `File "${file.name}" exceeds the maximum size of ${formatBytes(maxSize)}.`;
  }

  if (!matchesAcceptedType(acceptedTypes, file)) {
    return `File "${file.name}" is not an accepted file type.`;
  }

  return null;
};

const normalizeFiles = (files: (File | FileMetadata)[]) =>
  files.map((file) => ({
    file,
    id: createFileId(file),
    preview: createFilePreview(file),
  }));

const getAvailableSlots = ({
  existingFilesLength,
  maxFiles,
  nextFilesLength,
}: {
  existingFilesLength: number;
  maxFiles: number;
  nextFilesLength: number;
}) => {
  if (maxFiles === DEFAULT_MAX_FILES) {
    return nextFilesLength;
  }

  return maxFiles - existingFilesLength;
};

const getCandidateFiles = ({
  availableSlots,
  multiple,
  nextFiles,
}: {
  availableSlots: number;
  multiple: boolean;
  nextFiles: File[];
}) => {
  if (multiple) {
    return nextFiles.slice(0, availableSlots);
  }

  return nextFiles.slice(0, 1);
};

const collectValidFiles = ({
  acceptedTypes,
  candidates,
  existingFiles,
  maxSize,
}: {
  acceptedTypes: string[];
  candidates: File[];
  existingFiles: FileWithPreview[];
  maxSize: number;
}) => {
  const errors: string[] = [];
  const validFiles: File[] = [];

  for (const file of candidates) {
    const error = buildFileError(file, acceptedTypes, maxSize);

    if (error) {
      errors.push(error);
      continue;
    }

    const isDuplicate = existingFiles.some(
      (existingFile) =>
        existingFile.file.name === file.name &&
        existingFile.file.size === file.size
    );

    if (!isDuplicate) {
      validFiles.push(file);
    }
  }

  return {
    errors,
    validFiles,
  };
};

export const useFileUpload = (
  options: FileUploadOptions = {}
): [FileUploadState, FileUploadActions] => {
  const {
    accept = "*",
    initialFiles = [],
    maxFiles = DEFAULT_MAX_FILES,
    maxSize = DEFAULT_MAX_SIZE,
    multiple = false,
    onFilesAdded,
    onFilesChange,
  } = options;

  const inputRef = useRef<HTMLInputElement>(null);
  const acceptedTypes = formatAcceptedTypes(accept);

  const [state, setState] = useState<FileUploadState>({
    errors: [],
    files: normalizeFiles(initialFiles),
    isDragging: false,
  });

  const syncFiles = useCallback(
    (files: FileWithPreview[], errors: string[] = [], isDragging?: boolean) => {
      setState((prev) => ({
        errors,
        files,
        isDragging: isDragging ?? prev.isDragging,
      }));
      onFilesChange?.(files);
    },
    [onFilesChange]
  );

  const clearFiles = useCallback(() => {
    setState((prev) => {
      for (const file of prev.files) {
        revokeFilePreview(file);
      }

      if (inputRef.current) {
        inputRef.current.value = "";
      }

      onFilesChange?.([]);

      return {
        errors: [],
        files: [],
        isDragging: false,
      };
    });
  }, [onFilesChange]);

  const clearErrors = useCallback(() => {
    setState((prev) => ({
      ...prev,
      errors: [],
    }));
  }, []);

  const addFiles = useCallback(
    (incomingFiles: FileList | File[]) => {
      const nextFiles = Array.from(incomingFiles);

      if (nextFiles.length === 0) {
        return;
      }

      const existingFiles = multiple ? state.files : [];
      const availableSlots = getAvailableSlots({
        existingFilesLength: existingFiles.length,
        maxFiles,
        nextFilesLength: nextFiles.length,
      });

      if (availableSlots <= 0) {
        setState((prev) => ({
          ...prev,
          errors: [`You can only upload a maximum of ${maxFiles} files.`],
        }));
        return;
      }

      const candidates = getCandidateFiles({
        availableSlots,
        multiple,
        nextFiles,
      });
      const { errors, validFiles } = collectValidFiles({
        acceptedTypes,
        candidates,
        existingFiles,
        maxSize,
      });

      const addedFiles = normalizeFiles(validFiles);
      const files = multiple ? [...existingFiles, ...addedFiles] : addedFiles;

      onFilesAdded?.(addedFiles);
      syncFiles(files, errors, false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [
      acceptedTypes,
      maxFiles,
      maxSize,
      multiple,
      onFilesAdded,
      state.files,
      syncFiles,
    ]
  );

  const removeFile = useCallback(
    (id: string) => {
      const fileToRemove = state.files.find((file) => file.id === id);

      if (fileToRemove) {
        revokeFilePreview(fileToRemove);
      }

      syncFiles(
        state.files.filter((file) => file.id !== id),
        [],
        false
      );
    },
    [state.files, syncFiles]
  );

  const handleDragEnter = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setState((prev) => ({
      ...prev,
      isDragging: true,
    }));
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.currentTarget.contains(event.relatedTarget as Node)) {
      return;
    }

    setState((prev) => ({
      ...prev,
      isDragging: false,
    }));
  }, []);

  const handleDragOver = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();

      setState((prev) => ({
        ...prev,
        isDragging: false,
      }));

      if (inputRef.current?.disabled) {
        return;
      }

      if (event.dataTransfer.files.length === 0) {
        return;
      }

      if (multiple) {
        addFiles(event.dataTransfer.files);
        return;
      }

      addFiles([event.dataTransfer.files[0]]);
    },
    [addFiles, multiple]
  );

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (event.target.files && event.target.files.length > 0) {
        addFiles(event.target.files);
      }
    },
    [addFiles]
  );

  const openFileDialog = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const getInputProps = useCallback(
    (props: InputHTMLAttributes<HTMLInputElement> = {}) => ({
      ...props,
      accept: props.accept || accept,
      multiple: props.multiple === undefined ? multiple : props.multiple,
      onChange: handleFileChange,
      // biome-ignore lint/suspicious/noExplicitAny: cross-package ref compatibility
      ref: inputRef as any,
      type: "file" as const,
    }),
    [accept, handleFileChange, multiple]
  );

  return [
    state,
    {
      addFiles,
      clearErrors,
      clearFiles,
      getInputProps,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      handleFileChange,
      openFileDialog,
      removeFile,
    },
  ];
};

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) {
    return "0 Bytes";
  }

  const k = 1024;
  const precision = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const index = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Number.parseFloat((bytes / k ** index).toFixed(precision))}${sizes[index]}`;
};
