from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

from backend_v2.app.core.config import get_config


def _gemini_settings() -> tuple[str, str, int]:
    config = get_config()
    api_key = os.environ.get('GEMINI_API_KEY', '')
    model = os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash')
    return api_key, model, config.ai_timeout_seconds


def build_ai_fallback(mode: str, target: str, prompt: str, top_finding: dict | None) -> list[str]:
    parameter = top_finding['parameter'] if top_finding else 'asosiy parametr'
    severity = top_finding['severity'] if top_finding else 'High'
    payload_type = top_finding['payloadType'] if top_finding else 'Boolean-based'

    guidance = [
        f'Target: {target}. Tahlil rejimi: {mode}.',
        f'Top finding sifatida {parameter} parametri va {payload_type} turi ko\'rib chiqildi.',
        f'Severity {severity} bo\'lgani uchun input validation, parametrized query va server-side error handling birinchi navbatda tekshirilsin.',
    ]
    if mode == 'triage':
        guidance.append('Exploit ehtimoli yuqori endpointlar oldin manual review va regression testga yuborilsin.')
    elif mode == 'remediation':
        guidance.append('Prepared statements, ORM safe bindings va central validation middleware joriy qilish tavsiya etiladi.')
    else:
        guidance.append('False positive ehtimoli uchun response baseline, timing trend va status-code mapping qayta tekshirilsin.')
    guidance.append(f'Original prompt: {prompt}')
    return guidance


def build_prompt_optimizer_fallback(mode: str, target: str, prompt: str) -> dict[str, object]:
    optimized_prompt = (
        f"{target} endpointi bo'yicha {mode} rejimida faqat himoyaviy tahlil bering. "
        "Javob Uzbek tilida bo'lsin. Natijada 1) ustuvor xavf toifalari, 2) risk darajasi, "
        "3) ehtimoliy root-cause, 4) aniq remediation qadamlari, 5) regressiya testi uchun checklistni yozing. "
        f"Qo'shimcha operator izohi: {prompt.strip()}"
    )
    improvements = [
        'Prompt endpoint, rejim va javob tilini aniq ko\'rsatadi.',
        'Natija strukturasiga risk, sabab va remediation bo\'limlari qo\'shildi.',
        'AI modelga ekspluatatsiya emas, faqat himoyaviy tavsiya berish cheklovi berildi.',
    ]
    return {
        'provider': 'fallback',
        'model': 'local-rules',
        'optimizedPrompt': optimized_prompt,
        'improvements': improvements,
    }


def request_gemini_recommendation(*, mode: str, target: str, prompt: str, findings: list[dict], monitor_items: list[dict]) -> dict:
    gemini_api_key, gemini_model, timeout_seconds = _gemini_settings()
    top_finding = findings[0] if findings else None

    if not gemini_api_key:
        return {
            'provider': 'fallback',
            'model': 'local-rules',
            'recommendations': build_ai_fallback(mode, target, prompt, top_finding),
        }

    context = {
        'mode': mode,
        'target': target,
        'prompt': prompt,
        'top_findings': findings[:3],
        'monitor': monitor_items[:5],
    }
    body = {
        'contents': [
            {
                'parts': [
                    {
                        'text': (
                            'You are a secure remediation assistant for a defensive SQL injection review dashboard. '
                            'Do not provide exploit steps. Return concise remediation and triage bullets in Uzbek.\n\n'
                            f'Context JSON:\n{json.dumps(context, ensure_ascii=False)}'
                        )
                    }
                ]
            }
        ]
    }
    request = urllib.request.Request(
        url=f'https://generativelanguage.googleapis.com/v1/models/{gemini_model}:generateContent',
        data=json.dumps(body).encode('utf-8'),
        headers={
            'Content-Type': 'application/json',
            'x-goog-api-key': gemini_api_key,
        },
        method='POST',
    )

    try:
        with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
            payload = json.loads(response.read().decode('utf-8'))
            parts = payload['candidates'][0]['content']['parts']
            text = '\n'.join(part.get('text', '') for part in parts if part.get('text'))
            recommendations = [item.strip('- ').strip() for item in text.splitlines() if item.strip()]
            return {
                'provider': 'gemini',
                'model': gemini_model,
                'recommendations': recommendations[:8] or build_ai_fallback(mode, target, prompt, top_finding),
                'raw_text': text,
            }
    except (urllib.error.URLError, urllib.error.HTTPError, KeyError, IndexError, json.JSONDecodeError):
        return {
            'provider': 'fallback',
            'model': 'local-rules',
            'recommendations': build_ai_fallback(mode, target, prompt, top_finding),
        }


def request_prompt_optimization(*, mode: str, target: str, prompt: str) -> dict[str, object]:
    gemini_api_key, gemini_model, timeout_seconds = _gemini_settings()
    fallback = build_prompt_optimizer_fallback(mode, target, prompt)

    if not gemini_api_key:
        return fallback

    body = {
        'contents': [
            {
                'parts': [
                    {
                        'text': (
                            'You optimize prompts for a defensive SQL injection dashboard assistant. '
                            'Do not include exploit steps. Return plain text with this exact structure:\n'
                            'OPTIMIZED: <single paragraph>\n'
                            'IMPROVEMENTS:\n- item\n- item\n- item\n\n'
                            f'Mode: {mode}\nTarget: {target}\nOriginal prompt: {prompt}'
                        )
                    }
                ]
            }
        ]
    }
    request = urllib.request.Request(
        url=f'https://generativelanguage.googleapis.com/v1/models/{gemini_model}:generateContent',
        data=json.dumps(body).encode('utf-8'),
        headers={
            'Content-Type': 'application/json',
            'x-goog-api-key': gemini_api_key,
        },
        method='POST',
    )

    try:
        with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
            payload = json.loads(response.read().decode('utf-8'))
            parts = payload['candidates'][0]['content']['parts']
            text = '\n'.join(part.get('text', '') for part in parts if part.get('text')).strip()
            optimized_prompt = ''
            improvements: list[str] = []
            current_section = ''
            for raw_line in text.splitlines():
                line = raw_line.strip()
                if not line:
                    continue
                if line.startswith('OPTIMIZED:'):
                    optimized_prompt = line.removeprefix('OPTIMIZED:').strip()
                    current_section = 'optimized'
                    continue
                if line == 'IMPROVEMENTS:':
                    current_section = 'improvements'
                    continue
                if current_section == 'optimized' and not optimized_prompt:
                    optimized_prompt = line
                elif current_section == 'improvements':
                    improvements.append(line.lstrip('- ').strip())

            if not optimized_prompt:
                return fallback

            return {
                'provider': 'gemini',
                'model': gemini_model,
                'optimizedPrompt': optimized_prompt,
                'improvements': improvements[:5] or fallback['improvements'],
            }
    except (urllib.error.URLError, urllib.error.HTTPError, KeyError, IndexError, json.JSONDecodeError):
        return fallback
