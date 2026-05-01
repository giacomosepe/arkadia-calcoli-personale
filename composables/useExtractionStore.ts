import type { Ref } from "vue";
import type { ExtractedRow, ExtractionResult, ExtractionWarning } from "~/types";

const STORAGE_KEY = "lul_result";
const _result = ref<ExtractionResult | null>(null);
const _editedRows = ref<Set<string>>(new Set());
const _declaredOverrides = ref<Map<string, number>>(new Map());

function rowKey(row: ExtractedRow): string {
	return `${row.employee}__${row.year}__${row.month}__${row.day}`;
}

function warnKey(warning: ExtractionWarning): string {
	return `${warning.employee}__${warning.year}__${warning.month}`;
}

function actualHours(warning: ExtractionWarning): number {
	if (!_result.value) return warning.actual;
	return (
		Math.round(
			_result.value.rows
				.filter(
					(row) =>
						row.employee === warning.employee &&
						row.month === warning.month &&
						row.year === warning.year,
				)
				.reduce((sum, row) => sum + row.hours, 0) * 10000,
		) / 10000
	);
}

function declaredHours(warning: ExtractionWarning): number {
	return _declaredOverrides.value.get(warnKey(warning)) ?? warning.declared;
}

function isResolved(warning: ExtractionWarning): boolean {
	const diff = Math.round(Math.abs(declaredHours(warning) - actualHours(warning)) * 10000) / 10000;
	return diff <= 0.1;
}

const editedCount = computed(() => _editedRows.value.size);
const unresolvedCount = computed(() => {
	if (!_result.value) return 0;
	return _result.value.warnings.filter((warning) => !isResolved(warning)).length;
});

function resetEditState() {
	_editedRows.value = new Set();
	_declaredOverrides.value = new Map();
}

export const useExtractionStore = () => {
	const result = _result as Readonly<Ref<ExtractionResult | null>>;
	const editedRows = _editedRows as Ref<Set<string>>;
	const declaredOverrides = _declaredOverrides as Ref<Map<string, number>>;

	const setResult = (r: ExtractionResult) => {
		_result.value = r;
		resetEditState();
		if (import.meta.client) {
			sessionStorage.setItem(STORAGE_KEY, JSON.stringify(r));
		}
	};

	const loadFromSession = () => {
		if (_result.value || !import.meta.client) return;

		try {
			const stored = sessionStorage.getItem(STORAGE_KEY);
			if (stored) _result.value = JSON.parse(stored) as ExtractionResult;
		} catch {
			// Ignore malformed or unavailable session data.
		}
	};

	const persistResult = () => {
		if (!_result.value || !import.meta.client) return;
		sessionStorage.setItem(STORAGE_KEY, JSON.stringify(_result.value));
	};

	const clearResult = () => {
		_result.value = null;
		resetEditState();
		if (import.meta.client) {
			sessionStorage.removeItem(STORAGE_KEY);
		}
	};

	const markEdited = (row: ExtractedRow) => {
		_editedRows.value = new Set([..._editedRows.value, rowKey(row)]);
	};

	const markDeleted = (row: ExtractedRow) => {
		_editedRows.value = new Set([..._editedRows.value, rowKey(row)]);
	};

	const setDeclaredOverride = (warning: ExtractionWarning, value: number) => {
		_declaredOverrides.value = new Map([
			..._declaredOverrides.value,
			[warnKey(warning), Math.round(value * 10000) / 10000],
		]);
	};

	return {
		result,
		editedRows,
		declaredOverrides,
		editedCount,
		unresolvedCount,
		setResult,
		loadFromSession,
		persistResult,
		clearResult,
		markEdited,
		markDeleted,
		setDeclaredOverride,
	};
};
