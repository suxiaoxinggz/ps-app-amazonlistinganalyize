import os
from openai import OpenAI
from typing import List, Dict, Any
import json
import time
import random

class LLMClient:
    def __init__(self, api_key: str, base_url: str = "https://api.openai.com/v1", model: str = "gpt-3.5-turbo"):
        self.client = OpenAI(api_key=api_key, base_url=base_url)
        self.model = model

    def _prepare_messages(self, system_prompt: str, user_prompt: str) -> List[Dict[str, str]]:
        """
        Prepares messages, handling model-specific quirks (e.g., Gemma doesn't support system role).
        """
        if "gemma" in self.model.lower():
            # Merge system prompt into user prompt for Gemma
            combined_prompt = f"Instruction: {system_prompt}\n\nTask: {user_prompt}"
            return [{"role": "user", "content": combined_prompt}]
        else:
            # Standard OpenAI format
            return [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]

    def _call_api_with_retry(self, messages: List[Dict[str, str]], response_format=None, max_tokens=None, retries=3):
        """
        Calls the API with retry logic for transient errors (429, 503).
        """
        last_exception = None
        for i in range(retries):
            try:
                kwargs = {
                    "model": self.model,
                    "messages": messages,
                }
                if response_format:
                    kwargs["response_format"] = response_format
                if max_tokens:
                    kwargs["max_tokens"] = max_tokens

                response = self.client.chat.completions.create(**kwargs)
                return response
            except Exception as e:
                error_str = str(e)
                last_exception = e
                # Retry on Rate Limit (429) or Service Unavailable (503)
                if "429" in error_str or "503" in error_str:
                    wait_time = (2 ** i) + random.random()
                    print(f"API Error {error_str}. Retrying in {wait_time:.2f}s...")
                    time.sleep(wait_time)
                else:
                    # Don't retry on other errors (e.g. 400 Bad Request)
                    raise e
        
        raise last_exception

    def translate_keywords(self, keywords: List[str]) -> Dict[str, str]:
        """
        Translates a list of keywords to Chinese.
        """
        if not keywords:
            return {}
            
        prompt = "Translate the following Amazon keywords to Chinese. Return a JSON object where keys are the original keywords and values are the translations:\n\n"
        prompt += "\n".join(keywords)
        
        try:
            messages = self._prepare_messages(
                system_prompt="You are a helpful translator for Amazon sellers. Output valid JSON only.",
                user_prompt=prompt
            )
            
            # Try with json_object format first, fallback to plain text if unsupported
            try:
                response = self._call_api_with_retry(messages, response_format={"type": "json_object"})
            except Exception as format_err:
                error_str = str(format_err).lower()
                if "json" in error_str or "response_format" in error_str or "400" in error_str:
                    # Model doesn't support json_object, retry without it
                    response = self._call_api_with_retry(messages)
                else:
                    raise format_err
            
            content = response.choices[0].message.content
            # Try to extract JSON from response (may contain markdown code blocks)
            import re
            json_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', content)
            if json_match:
                content = json_match.group(1).strip()
            return json.loads(content)
        except Exception as e:
            print(f"Translation error: {e}")
            return {}

    def optimize_listing(self, current_listing: Dict[str, str], missing_keywords: List[str], custom_prompt: str = None) -> str:
        """
        Generates optimization suggestions based on missing keywords.
        """
        def sanitize(text):
            if not text: return ""
            return text.replace('\u2013', '-').replace('\u2014', '-').replace('\u2018', "'").replace('\u2019', "'").replace('\u201c', '"').replace('\u201d', '"')

        title = sanitize(current_listing.get('title', ''))
        bullets = sanitize(current_listing.get('bullets', ''))
        
        if custom_prompt:
            prompt = f"""
            Context Data:
            Current Title: {title}
            Current Bullets: {bullets}
            Missing Keywords: {', '.join(missing_keywords)}

            Instructions:
            {custom_prompt}
            """
        else:
            prompt = f"""
            I have an Amazon listing that is missing some high-value keywords.
            
            Current Title: {title}
            Current Bullets: {bullets}
            
            Missing Keywords (High Opportunity):
            {', '.join(missing_keywords)}
            
            Please rewrite the Title and Bullet Points to naturally include these missing keywords while maintaining readability and sales copy best practices.
            Mark the inserted keywords in **bold**.
            """
        
        try:
            messages = self._prepare_messages(
                system_prompt="You are an expert Amazon Listing Copywriter.",
                user_prompt=prompt
            )
            
            response = self._call_api_with_retry(messages, max_tokens=4000)
            
            return response.choices[0].message.content
        except Exception as e:
            return f"Optimization error: {e}"

    def translate_text(self, text: str) -> str:
        """
        Translates text to Chinese.
        """
        if not text:
            return ""
            
        prompt = f"""
        Translate the following Amazon listing content to Chinese. 
        Output ONLY the translated text. 
        Do not include any explanations, notes, or extra text.
        
        Content:
        {text}
        """
        
        try:
            messages = self._prepare_messages(
                system_prompt="You are a professional translator. Output only the translation.",
                user_prompt=prompt
            )
            
            response = self._call_api_with_retry(messages)
            
            return response.choices[0].message.content
        except Exception as e:
            return f"Translation error: {e}"
