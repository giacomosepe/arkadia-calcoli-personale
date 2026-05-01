type UseTracking = {
	trackExtractionStarted: (documentId: string, documentName: string) => void;
	trackExtractionCompleted: (
		documentId: string,
		documentName: string,
		durationMs: number,
	) => void;
	trackResultExported: (documentId: string) => void;
};

export const useTracking = (): UseTracking => {
	const { $posthog } = useNuxtApp();

	const trackExtractionStarted = (
		documentId: string,
		documentName: string,
	): void => {
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
		$posthog().capture("extraction_completed", {
			document_id: documentId,
			document_name: documentName,
			duration_ms: durationMs,
			timestamp: new Date().toISOString(),
		});
	};

	const trackResultExported = (documentId: string): void => {
		$posthog().capture("result_exported", {
			document_id: documentId,
			export_format: "excel",
			timestamp: new Date().toISOString(),
		});
	};

	return {
		trackExtractionStarted,
		trackExtractionCompleted,
		trackResultExported,
	};
};
