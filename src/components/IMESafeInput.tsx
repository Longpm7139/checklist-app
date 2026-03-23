'use client';

import React, { useState, useEffect, useRef } from 'react';

interface IMESafeInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    value: string;
    onChangeValue: (val: string) => void;
    debounceMs?: number;
}

export function IMESafeInput({
    value,
    onChangeValue,
    debounceMs = 800,
    className,
    ...props
}: IMESafeInputProps) {
    const [localValue, setLocalValue] = useState(value);
    const isComposing = useRef(false);
    const isFocused = useRef(false);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    // Sync with external value only when not interacting
    useEffect(() => {
        if (!isFocused.current && !isComposing.current && value !== localValue) {
            setLocalValue(value);
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setLocalValue(val);

        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        if (!isComposing.current) {
            debounceTimer.current = setTimeout(() => {
                onChangeValue(val);
            }, debounceMs);
        }
    };

    const handleCompositionStart = () => {
        isComposing.current = true;
    };

    const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
        isComposing.current = false;
        const val = (e.target as HTMLInputElement).value;
        setLocalValue(val);

        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            onChangeValue(val);
        }, debounceMs);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        isFocused.current = true;
        props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        isFocused.current = false;
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        if (localValue !== value) {
            onChangeValue(localValue);
        }
        props.onBlur?.(e);
    };

    return (
        <input
            {...props}
            className={className}
            value={localValue}
            onChange={handleChange}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            onFocus={handleFocus}
            onBlur={handleBlur}
        />
    );
}

interface IMESafeTextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    value: string;
    onChangeValue: (val: string) => void;
    debounceMs?: number;
}

export function IMESafeTextArea({
    value,
    onChangeValue,
    debounceMs = 800,
    className,
    ...props
}: IMESafeTextAreaProps) {
    const [localValue, setLocalValue] = useState(value);
    const isComposing = useRef(false);
    const isFocused = useRef(false);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!isFocused.current && !isComposing.current && value !== localValue) {
            setLocalValue(value);
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setLocalValue(val);

        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        if (!isComposing.current) {
            debounceTimer.current = setTimeout(() => {
                onChangeValue(val);
            }, debounceMs);
        }
    };

    const handleCompositionStart = () => {
        isComposing.current = true;
    };

    const handleCompositionEnd = (e: React.CompositionEvent<HTMLTextAreaElement>) => {
        isComposing.current = false;
        const val = (e.target as HTMLTextAreaElement).value;
        setLocalValue(val);

        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            onChangeValue(val);
        }, debounceMs);
    };

    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
        isFocused.current = true;
        props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
        isFocused.current = false;
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        if (localValue !== value) {
            onChangeValue(localValue);
        }
        props.onBlur?.(e);
    };

    return (
        <textarea
            {...props}
            className={className}
            value={localValue}
            onChange={handleChange}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            onFocus={handleFocus}
            onBlur={handleBlur}
        />
    );
}
