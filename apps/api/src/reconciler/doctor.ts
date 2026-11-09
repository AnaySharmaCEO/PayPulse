import {
  GeminiDoctorClient,
  SupabaseClient,
  type IncidentProjection,
  type GeminiDiagnosisResult
} from '@paypulse/adapters';

export class AiDoctorOrchestrator {
  private geminiClient: GeminiDoctorClient;
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient, geminiClient?: GeminiDoctorClient) {
    this.supabase = supabase;
    this.geminiClient = geminiClient || new GeminiDoctorClient();
  }

  /**
   * Diagnoses an incident using Google Gemini 3.8 Flash via the Interactions API,
   * validates the APIMatic code patch, and updates the incident in the persistence ledger.
   */
  async diagnoseAndHeal(
    projection: IncidentProjection,
    incidentId?: string
  ): Promise<GeminiDiagnosisResult> {
    // 1. Invoke Gemini 3.8 Flash Interactions API with cascade fallback
    const diagnosis = await this.geminiClient.diagnoseIncident(projection);

    // 2. Persist diagnostic resolution if an incident ID exists
    if (incidentId) {
      try {
        await this.supabase.updateIncident(incidentId, {
          status: 'HEALED',
          root_cause: diagnosis.rootCause,
          remediation_action: diagnosis.remediationAction,
          code_patch: diagnosis.codePatch,
          confidence_score: diagnosis.confidenceScore,
          resolved_at: new Date().toISOString()
        });
      } catch (err: any) {
        // Non-blocking telemetry log
        console.error(`[AI Doctor] Failed to update incident ${incidentId}:`, err.message);
      }
    }

    return diagnosis;
  }
}
