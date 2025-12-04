import React, { useState } from "react";
import { useWindowManager } from "../contexts/WindowManagerContext";

const InputDialogApp = ({
  windowId,
  title,
  message,
  onConfirm,
  defaultValue = "",
}) => {
  const { closeWindow } = useWindowManager();
  const [value, setValue] = useState(defaultValue);

  const handleOk = () => {
    if (value.trim()) {
      if (onConfirm) onConfirm(value);
    }
    closeWindow(windowId);
  };

  const handleCancel = () => {
    closeWindow(windowId);
  };

  return (
    <div className="w-full h-full bg-[#D4D0C8] p-4 flex flex-col justify-between font-sans select-none text-xs text-black">
      <div>
        <p className="mb-3">{message || "Enter value:"}</p>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full border-2 border-[#7F9DB9] p-1 outline-none focus:border-[#003399]"
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && handleOk()}
        />
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <button
          onClick={handleOk}
          className="w-20 h-6 bg-[#D4D0C8] border-t-white border-l-white border-2 border-r-gray-600 border-b-gray-600 text-xs shadow-sm active:border-r-white active:border-b-white active:border-l-gray-600 active:border-t-gray-600"
        >
          OK
        </button>
        <button
          onClick={handleCancel}
          className="w-20 h-6 bg-[#D4D0C8] border-t-white border-l-white border-2 border-r-gray-600 border-b-gray-600 text-xs shadow-sm active:border-r-white active:border-b-white active:border-l-gray-600 active:border-t-gray-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default InputDialogApp;
