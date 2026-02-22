import {
  isPlainObject,
  isString,
  optionalBoolean,
  optionalNumber,
  optionalString,
  pushError,
} from "../utils.js";

const validateCharacterBookEntry = (entry, path, errors) => {
  if (!isPlainObject(entry)) {
    pushError(errors, path, "must be an object");
    return;
  }

  if (!optionalString(entry.name)) {
    pushError(errors, `${path}.name`, "must be a string or null");
  }

  if (
    entry.keys !== undefined &&
    !(Array.isArray(entry.keys) && entry.keys.every((k) => isString(k)))
  ) {
    pushError(errors, `${path}.keys`, "must be an array of strings");
  }

  if (
    entry.secondary_keys !== undefined &&
    !(
      Array.isArray(entry.secondary_keys) &&
      entry.secondary_keys.every((k) => isString(k))
    )
  ) {
    pushError(
      errors,
      `${path}.secondary_keys`,
      "must be an array of strings",
    );
  }

  if (!isString(entry.content)) {
    pushError(errors, `${path}.content`, "must be a string");
  }

  if (!optionalBoolean(entry.enabled)) {
    pushError(errors, `${path}.enabled`, "must be a boolean");
  }

  if (!optionalNumber(entry.insertion_order)) {
    pushError(errors, `${path}.insertion_order`, "must be a number");
  }

  if (!optionalBoolean(entry.case_sensitive)) {
    pushError(errors, `${path}.case_sensitive`, "must be a boolean");
  }

  if (!optionalNumber(entry.priority)) {
    pushError(errors, `${path}.priority`, "must be a number");
  }

  if (!optionalBoolean(entry.constant)) {
    pushError(errors, `${path}.constant`, "must be a boolean");
  }
};

export const validateCharacterBook = (book, errors) => {
  if (book === undefined || book === null) {
    return;
  }

  if (!isPlainObject(book)) {
    pushError(errors, "payload.characterBook", "must be an object");
    return;
  }

  if (!optionalString(book.name)) {
    pushError(errors, "payload.characterBook.name", "must be a string or null");
  }

  if (!optionalString(book.description)) {
    pushError(
      errors,
      "payload.characterBook.description",
      "must be a string or null",
    );
  }

  if (book.entries !== undefined) {
    if (!Array.isArray(book.entries)) {
      pushError(errors, "payload.characterBook.entries", "must be an array");
    } else {
      book.entries.forEach((entry, index) => {
        validateCharacterBookEntry(
          entry,
          `payload.characterBook.entries[${index}]`,
          errors,
        );
      });
    }
  }
};
