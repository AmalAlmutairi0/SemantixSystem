def clean_data(data):
    errs = []
    row = {}

    try:
        age = int(data.get("age", ""))
        if age < 1 or age > 120:
            raise ValueError
        row["age"] = age
    except:
        errs.append({
            "type": "input",
            "label": "إدخال",
            "emoji": "⚠️",
            "fields": "العمر",
            "fields_label": "العمر",
            "text": "العمر غير صحيح",
            "confidence": 99,
            "conf_color": "orange",
            "severity": "high",
            "fix_field": "f-age",
            "fix_label": "العمر",
            "current_val": "",
            "context": "يرجى إدخال عمر صحيح بين 1 و120.",
            "options": [{"manual": True}]
        })

    edu = str(data.get("education", "")).strip()
    if not edu:
        errs.append({
            "type": "input",
            "label": "إدخال",
            "emoji": "⚠️",
            "fields": "المستوى التعليمي",
            "fields_label": "المستوى التعليمي",
            "text": "المستوى التعليمي مطلوب",
            "confidence": 99,
            "conf_color": "orange",
            "severity": "high",
            "fix_field": "f-edu",
            "fix_label": "المستوى التعليمي",
            "current_val": "",
            "context": "اختر مستوى تعليمي قبل الإرسال.",
            "options": [{"manual": True}]
        })
    else:
        row["education"] = edu

    row["job"] = str(data.get("job", "")).strip()
    row["notes"] = str(data.get("notes", "")).strip()

    try:
        exp = int(data.get("experience", 0))
        if exp < 0 or exp > 80:
            raise ValueError
        row["experience"] = exp
    except:
        errs.append({
            "type": "input",
            "label": "إدخال",
            "emoji": "⚠️",
            "fields": "سنوات الخبرة",
            "fields_label": "سنوات الخبرة",
            "text": "سنوات الخبرة غير صحيحة",
            "confidence": 99,
            "conf_color": "orange",
            "severity": "high",
            "fix_field": "f-exp",
            "fix_label": "سنوات الخبرة",
            "current_val": "",
            "context": "أدخل رقمًا صحيحًا لسنوات الخبرة.",
            "options": [{"manual": True}]
        })

    if errs:
        return False, errs

    return True, row