import json
import re
import os
from google import genai
from explain import to_ui, EDU_LABEL

AGE_MIN = {
    "primary": 7,
    "middle": 13,
    "high_school": 16,
    "bachelor": 19,
    "master": 23,
    "phd": 26
}

ORDER = ["primary", "middle", "high_school", "bachelor", "master", "phd"]

JOB_NEED = {
    "طبيب": "bachelor",
    "دكتور": "bachelor",
    "مهندس": "bachelor",
    "محاسب": "bachelor",
    "صيدلي": "bachelor",
    "ممرض": "bachelor",
    "معلم": "bachelor",
    "مبرمج": "bachelor",
    "محامي": "bachelor",
    "أستاذ": "master",
    "استشاري": "master",
    "جراح": "bachelor",
    "مدير": "bachelor",
    "باحث": "master"
}

def age_pick(age):
    if 7 <= age <= 12:
        return "primary"
    if 13 <= age <= 15:
        return "middle"
    if 16 <= age <= 18:
        return "high_school"
    if 19 <= age <= 22:
        return "bachelor"
    if 23 <= age <= 25:
        return "master"
    return "phd"

def base_rules(row):
    age = row["age"]
    edu = row["education"]
    job = row["job"]
    exp = row["experience"]
    out = []

    min_age = AGE_MIN.get(edu)
    if min_age and age < min_age:
        out.append({
            "type": "stat",
            "rule": "AGE_EDU_MISMATCH",
            "fields": ["age", "education"],
            "severity": "high",
            "confidence": 0.90,
            "reason": f"العمر {age} سنة لا يتوافق مع المستوى التعليمي {EDU_LABEL.get(edu, edu)}",
            "suggestion": {"education": age_pick(age)}
        })

    max_exp = max(0, age - 18)
    if exp > max_exp + 2:
        out.append({
            "type": "logic",
            "rule": "EXP_AGE_MISMATCH",
            "fields": ["age", "experience"],
            "severity": "high",
            "confidence": 0.89,
            "reason": f"سنوات الخبرة {exp} سنة أعلى من الحد المنطقي للعمر {age} سنة",
            "suggestion": {"experience": max_exp}
        })

    if age < 18 and job.strip():
        hard_words = ["طبيب", "دكتور", "مهندس", "محاسب", "استشاري", "مدير", "معلم", "محامي", "صيدلي", "جراح", "باحث"]
        if any(w in job for w in hard_words):
            out.append({
                "type": "semantic",
                "rule": "JOB_AGE_MISMATCH",
                "fields": ["age", "job"],
                "severity": "medium",
                "confidence": 0.84,
                "reason": f"المسمى الوظيفي {job} لا يتناسب مع العمر {age} سنة",
                "suggestion": {"job": "طالب"}
            })

    if age >= 18:
        for w, need in JOB_NEED.items():
            if w in job and edu in ORDER and need in ORDER and ORDER.index(edu) < ORDER.index(need):
                out.append({
                    "type": "semantic",
                    "rule": "EDU_JOB_MISMATCH",
                    "fields": ["education", "job"],
                    "severity": "medium",
                    "confidence": 0.82,
                    "reason": f"المسمى الوظيفي {job} يحتاج عادة مستوى تعليمي أعلى من {EDU_LABEL.get(edu, edu)}",
                    "suggestion": {"education": need}
                })
                break

    return out

def make_prompt(row, rules):
    return f'''
أنت مساعد تحقق دلالي لنماذج الاستبيانات.
افحص السجل التالي واكشف فقط التعارضات المنطقية أو الدلالية الحقيقية بين العمر والتعليم والمسمى الوظيفي والخبرة.

السجل:
{json.dumps(row, ensure_ascii=False)}

نتائج أولية من القواعد:
{json.dumps(rules, ensure_ascii=False)}

أعد JSON فقط بهذا الشكل:
{{
  "issues": [
    {{
      "type": "logic أو semantic أو stat",
      "rule": "اسم قصير",
      "fields": ["age","education"],
      "severity": "low أو medium أو high",
      "reason": "شرح عربي واضح",
      "suggestions": [
        {{
          "field": "education",
          "value": "primary",
          "confidence": 0.91
        }}
      ],
      "confidence": 0.90
    }}
  ]
}}
'''

def parse_json_text(txt):
    txt = (txt or "").strip()
    if txt.startswith("```"):
        txt = re.sub(r"^```(?:json)?", "", txt).strip()
        txt = re.sub(r"```$", "", txt).strip()
    try:
        return json.loads(txt)
    except:
        pass
    m = re.search(r'\{[\s\S]*\}', txt)
    if m:
        return json.loads(m.group(0))
    raise ValueError("Could not parse model JSON")

def ask_llm(row, rules):
    key = os.getenv("GEMINI_API_KEY", "").strip() or os.getenv("GOOGLE_API_KEY", "").strip()
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()

    if not key:
        raise Exception("GEMINI_API_KEY not found")

    client = genai.Client(api_key=key)
    response = client.models.generate_content(
        model=model,
        contents=make_prompt(row, rules)
    )

    txt = getattr(response, "text", "") or ""
    if not txt:
        raise ValueError("Empty Gemini response")

    data = parse_json_text(txt)
    return data.get("issues", [])

def get_fix_key(item):
    sug = item.get("suggestion", {})
    if sug:
        return list(sug.keys())[0], list(sug.values())[0]
    arr = item.get("suggestions") or []
    for s in arr:
        if s.get("field") and "value" in s:
            return s["field"], s["value"]
    return "", ""

def same_issue(a, b):
    a_field, a_val = get_fix_key(a)
    b_field, b_val = get_fix_key(b)

    if not a_field or not b_field:
        return False

    a_fields = tuple(sorted(a.get("fields", [])))
    b_fields = tuple(sorted(b.get("fields", [])))

    return (
        a.get("type") == b.get("type")
        and a_field == b_field
        and str(a_val) == str(b_val)
        and a_fields == b_fields
    )

def strip_llm_dupes(llm_items, rules):
    out = []
    for x in llm_items:
        dup = False
        for r in rules:
            if same_issue(x, r):
                dup = True
                break
        if not dup:
            out.append(x)
    return out

def dedupe(items):
    seen = set()
    out = []
    for x in items:
        sug = ""
        opts = x.get("options", [])
        for o in opts:
            if isinstance(o, dict) and o.get("suggested"):
                sug = str(o.get("value", ""))
                break

        key = (
            x.get("fix_field", ""),
            x.get("type", ""),
            sug
        )

        if key in seen:
            continue

        seen.add(key)
        out.append(x)

    return out

def quality_score(items):
    if not items:
        return 0.98
    s = 0.98
    for x in items:
        if x.get("severity") == "high":
            s -= 0.30
        elif x.get("severity") == "medium":
            s -= 0.18
        else:
            s -= 0.08
    return round(max(0.10, s), 2)

def review_prompt(row, rules):
    return f'''
أنت محكّم دقيق لنظام فحص استبيانات.

السجل:
{json.dumps(row, ensure_ascii=False)}

المشكلات:
{json.dumps(rules, ensure_ascii=False)}

أعد JSON فقط:
{{
  "reviewed": [
    {{
      "rule": "",
      "fields": [],
      "verdict": "valid أو incorrect",
      "reason": "",
      "suggestion": {{}}
    }}
  ]
}}
'''

def review_rules_with_llm(row, rules):
    if not rules:
        return rules

    key = os.getenv("GEMINI_API_KEY", "").strip() or os.getenv("GOOGLE_API_KEY", "").strip()
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()

    if not key:
        raise Exception("GEMINI_API_KEY not found")

    client = genai.Client(api_key=key)
    response = client.models.generate_content(
        model=model,
        contents=review_prompt(row, rules)
    )

    txt = getattr(response, "text", "") or ""
    if not txt:
        raise ValueError("Empty response")

    data = parse_json_text(txt)
    reviewed = data.get("reviewed", [])

    verdict_map = {
        (r.get("rule", ""), tuple(sorted(r.get("fields", [])))): r
        for r in reviewed
    }

    kept = []

    for issue in rules:
        key = (issue.get("rule", ""), tuple(sorted(issue.get("fields", []))))
        verdict_info = verdict_map.get(key)

        if not verdict_info:
            kept.append(issue)
            continue

        if verdict_info.get("verdict") == "incorrect":
            continue

        updated = dict(issue)

        if verdict_info.get("reason"):
            updated["reason"] = verdict_info["reason"]

        if verdict_info.get("suggestion"):
            updated["suggestion"] = verdict_info["suggestion"]

        kept.append(updated)

    return kept

def check_data(row):
    rules = base_rules(row)
    llm_error = ""

    try:
        try:
            rules = review_rules_with_llm(row, rules)
        except:
            pass

        llm_raw = ask_llm(row, rules)
        llm_raw = strip_llm_dupes(llm_raw, rules)
        source = "llm+rules" if llm_raw else "rules+llm"
    except Exception as e:
        llm_raw = []
        source = "rules"
        llm_error = str(e)

    items = [to_ui(x, row) for x in rules] + [to_ui(x, row) for x in llm_raw]
    items = dedupe(items)
    return items, quality_score(items), source, llm_error