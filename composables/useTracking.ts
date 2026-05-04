type UseTracking = {
	trackExtractionStarted: (documentId: string, documentName: string) => void;
	trackExtractionCompleted: (
		documentId: string,
		documentName: string,
		durationMs: number,
	) => void;
	trackExtractionFailed: (
		documentId: string,
		documentName: string,
		reason: "zero_rows" | "api_error",
		errorMessage?: string,
	) => void;
	trackResultExported: (documentId: string) => void;
};

export const useTracking = (): UseTracking => {
	const trackExtractionStarted = (
		documentId: string,
		documentName: string,
	): void => {
		const { $posthog } = useNuxtApp();
		$posthog().capture("extraction_started", {
			document_id: documentId,
			document_name: documentName,
			timestamp: new Date().toISOString(),
		});
	};

	const trackExtractionCompleted = (
		documentId: string,
		documentName: string,
		durationMs: number,
	): void => {
		const { $posthog } = useNuxtApp();
		$posthog().capture("extraction_completed", {
			document_id: documentId,
			document_name: documentName,
			duration_ms: durationMs,
			timestamp: new Date().toISOString(),
		});
	};

	const trackExtractionFailed = (
		documentId: string,
		documentName: string,
		reason: "zero_rows" | "api_error",
		errorMessage?: string,
	): void => {
		const { $posthog } = useNuxtApp();
		$posthog().capture("extraction_failed", {
			document_id: documentId,
			document_name: documentName,
			reason,
			error_message: errorMessage,
			timestamp: new Date().toISOString(),
		});
	};

	const trackResultExported = (documentId: string): void => {
		const { $posthog } = useNuxtApp();
		$posthog().capture("result_exported", {
			document_id: documentId,
			export_format: "excel",
			timestamp: new Date().toISOString(),
		});
	};

	return {
		trackExtractionStarted,
		trackExtractionCompleted,
		trackExtractionFailed,
		trackResultExported,
	};
};
