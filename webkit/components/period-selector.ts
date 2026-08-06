import {
  formatDateInput,
  getPeriodOptionLabel,
  type PeriodKind,
  type PeriodSelection,
} from "../domain/period";

const PERIOD_KINDS: readonly PeriodKind[] = [
  "this-month",
  "last-month",
  "last-3-months",
  "this-year",
  "custom",
];

export interface PeriodSelector {
  readonly element: HTMLElement;
  update(selection: PeriodSelection): void;
  destroy(): void;
}

/** A compact Steam-styled control for the dashboard-wide time period. */
export function createPeriodSelector(
  selected: PeriodSelection,
  onChange: (selection: PeriodSelection) => void,
): PeriodSelector {
  let currentSelection = selected;
  let customPickerOpen = false;
  const element = document.createElement("div");
  element.className = "steam-wrapped-period-selector";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "steam-wrapped-period-selector__button";
  button.setAttribute("aria-haspopup", "listbox");
  button.setAttribute("aria-expanded", "false");

  const buttonLabel = document.createElement("span");
  const chevron = document.createElement("span");
  chevron.className = "steam-wrapped-period-selector__chevron";
  chevron.setAttribute("aria-hidden", "true");
  chevron.textContent = "⌄";
  button.append(buttonLabel, chevron);

  const menu = document.createElement("div");
  menu.className = "steam-wrapped-period-selector__menu";
  menu.setAttribute("role", "listbox");
  menu.hidden = true;

  for (const kind of PERIOD_KINDS) {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "steam-wrapped-period-selector__option";
    option.textContent = getPeriodOptionLabel(kind);
    option.setAttribute("role", "option");
    option.dataset.periodKind = kind;
    option.addEventListener("click", () => {
      if (kind === "custom") {
        setOpen(false);
        setCustomPickerOpen(true);
        return;
      }
      const next = createSelection(kind, currentSelection);
      setCustomPickerOpen(false);
      setOpen(false);
      currentSelection = next;
      onChange(next);
    });
    menu.append(option);
  }

  const customRange = document.createElement("div");
  customRange.className = "steam-wrapped-custom-range";
  customRange.hidden = true;

  const startInput = createDateInput("Start date");
  const endInput = createDateInput("End date");
  const customFields = document.createElement("div");
  customFields.className = "steam-wrapped-custom-range__fields";
  const separator = document.createElement("span");
  separator.textContent = "to";
  customFields.append(startInput, separator, endInput);

  const validationMessage = document.createElement("span");
  validationMessage.className = "steam-wrapped-custom-range__validation";
  validationMessage.setAttribute("role", "alert");

  const customActions = document.createElement("div");
  customActions.className = "steam-wrapped-custom-range__actions";
  const applyButton = document.createElement("button");
  applyButton.type = "button";
  applyButton.className = "steam-wrapped-custom-range__apply";
  applyButton.textContent = "Apply";
  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.className = "steam-wrapped-custom-range__cancel";
  cancelButton.textContent = "Cancel";
  customActions.append(applyButton, cancelButton);
  customRange.append(customFields, validationMessage, customActions);

  const validateCustomRange = (): boolean => {
    endInput.min = startInput.value;
    const valid = Boolean(startInput.value && endInput.value && endInput.value >= startInput.value);
    applyButton.disabled = !valid;
    validationMessage.textContent = valid ? "" : "Choose an end date on or after the start date.";
    return valid;
  };

  const setCustomDraft = (selection: PeriodSelection): void => {
    const now = new Date();
    const today = formatDateInput(now);
    startInput.max = today;
    endInput.max = today;
    startInput.value = selection.startDate || formatDateInput(new Date(now.getFullYear(), now.getMonth(), 1));
    endInput.value = selection.endDate || formatDateInput(now);
    validateCustomRange();
  };

  const setCustomPickerOpen = (open: boolean): void => {
    customPickerOpen = open;
    customRange.hidden = !open;
    if (open) {
      setCustomDraft(createSelection("custom", currentSelection));
      buttonLabel.textContent = getPeriodOptionLabel("custom");
    } else {
      validationMessage.textContent = "";
    }
  };

  startInput.addEventListener("input", validateCustomRange);
  endInput.addEventListener("input", validateCustomRange);

  const setOpen = (open: boolean): void => {
    menu.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
  };
  button.addEventListener("click", () => {
    if (!customPickerOpen) {
      setOpen(menu.hidden);
    }
  });

  applyButton.addEventListener("click", () => {
    if (!validateCustomRange()) {
      return;
    }
    const next: PeriodSelection = {
      kind: "custom",
      startDate: startInput.value,
      endDate: endInput.value,
    };
    currentSelection = next;
    setCustomPickerOpen(false);
    setOpen(false);
    update(next);
    onChange(next);
  });

  cancelButton.addEventListener("click", () => {
    setCustomPickerOpen(false);
    setOpen(false);
    update(currentSelection);
  });

  const onPointerDown = (event: PointerEvent): void => {
    if (event.target instanceof Node && !element.contains(event.target)) {
      setOpen(false);
    }
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      if (customPickerOpen) {
        setCustomPickerOpen(false);
        update(currentSelection);
      } else {
        setOpen(false);
      }
      button.focus();
    }
  };
  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("keydown", onKeyDown);

  element.append(button, menu, customRange);

  const update = (selection: PeriodSelection): void => {
    currentSelection = selection;
    buttonLabel.textContent = getPeriodOptionLabel(selection.kind);
    if (!customPickerOpen) {
      customRange.hidden = true;
    }
    for (const option of Array.from(menu.querySelectorAll<HTMLButtonElement>("[data-period-kind]"))) {
      option.setAttribute("aria-selected", String(option.dataset.periodKind === selection.kind));
    }
  };

  update(selected);
  return {
    element,
    update,
    destroy: () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    },
  };
}

function createSelection(kind: PeriodKind, current: PeriodSelection): PeriodSelection {
  if (kind !== "custom") {
    return { kind };
  }

  const now = new Date();
  return {
    kind,
    startDate: current.startDate || formatDateInput(new Date(now.getFullYear(), now.getMonth(), 1)),
    endDate: current.endDate || formatDateInput(now),
  };
}

function createDateInput(label: string): HTMLInputElement {
  const input = document.createElement("input");
  input.className = "steam-wrapped-custom-range__date";
  input.type = "date";
  input.setAttribute("aria-label", label);
  return input;
}
