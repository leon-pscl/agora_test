declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_AGORA_APP_ID: string;
    NEXT_AGORA_APP_CERTIFICATE: string;
    NEXT_PUBLIC_AGENT_UID?: string;
    NEXT_PUBLIC_LANDLORD_ID?: string;
    NEXT_AGENT_NAME?: string;
    NEXT_AGENT_GREETING?: string;
    NEXT_LLM_API_KEY?: string;
    NEXT_AZURE_TTS_KEY?: string;
    NEXT_AZURE_TTS_REGION?: string;
    NEXT_AZURE_TTS_VOICE_NAME?: string;
    NEXT_DEEPGRAM_API_KEY?: string;
  }
}
