EDU_LABEL = {
    "primary": "ابتدائي",
    "middle": "متوسط",
    "high_school": "ثانوي",
    "bachelor": "بكالوريوس",
    "master": "ماجستير",
    "phd": "دكتوراه"
}

FIELD_ID = {
    "age": "f-age",
    "education": "f-edu",
    "job": "f-job",
    "experience": "f-exp",
    "notes": "f-notes"
}

FIELD_LABEL = {
    "age": "العمر",
    "education": "المستوى التعليمي",
    "job": "المهنة الحالية",
    "experience": "سنوات الخبرة",
    "notes": "ملاحظات إضافية"
}

TYPE_LABEL = {
    "logic": ("منطقي", "🔗", "orange"),
    "semantic": ("دلالي", "💬", "purple"),
    "stat": ("إحصائي", "📊", "blue"),
    "input": ("إدخال", "⚠️", "orange")
}

def show_value(field, value):
    if field == "education":
        return EDU_LABEL.get(value, value)
    return str(value)

def to_ui(item, row):
    t = item.get("type", "semantic")
    label, emoji, conf_color = TYPE_LABEL.get(t, ("دلالي", "💬", "purple"))

    suggestion = item.get("suggestion", {})
    if not suggestion and item.get("suggestions"):
        for s in item["suggestions"]:
            if s.get("field") and "value" in s:
                suggestion = {s["field"]: s["value"]}
                break

    fix_key = list(suggestion.keys())[0] if suggestion else ""
    fix_field = FIELD_ID.get(fix_key, "")
    fix_label = FIELD_LABEL.get(fix_key, "")
    current_val = show_value(fix_key, row.get(fix_key, "")) if fix_key else ""

    fields = item.get("fields", [])
    fields_label = " · ".join(FIELD_LABEL.get(f, f) for f in fields) if fields else "—"

    text = (item.get("reason") or item.get("text") or "يوجد تعارض في البيانات").strip()

    context = item.get("context", "").strip()
    if not context:
        if fix_key == "education":
            context = "يمكن تعديل المستوى التعليمي إلى قيمة أقرب لباقي البيانات."
        elif fix_key == "experience":
            context = "يمكن تعديل سنوات الخبرة إلى قيمة أقرب للحد المنطقي للعمر."
        elif fix_key == "job":
            context = "يمكن تعديل المسمى الوظيفي إلى قيمة أقرب للعمر الحالي."
        elif fix_key == "age":
            context = "يمكن مراجعة العمر والتأكد من إدخاله بشكل صحيح."
        else:
            context = "يرجى مراجعة البيانات قبل الإرسال."

    options = []
    if suggestion and fix_key:
        value = suggestion[fix_key]
        options.append({
            "value": value,
            "label": show_value(fix_key, value),
            "sub": "الاقتراح الأقرب",
            "suggested": True,
            "pct": f"{int(round(float(item.get('confidence', 0.8)) * 100))}٪"
        })
    options.append({"manual": True})

    return {
        "type": t,
        "label": label,
        "emoji": emoji,
        "fields": fields_label,
        "fields_label": fields_label,
        "text": text,
        "confidence": int(round(float(item.get("confidence", 0.8)) * 100)),
        "conf_color": conf_color,
        "severity": item.get("severity", "medium"),
        "fix_field": fix_field,
        "fix_label": fix_label,
        "current_val": current_val,
        "context": context,
        "options": options
    }