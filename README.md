طريقة تشغيل المشروع


1. 
تشغيل الـ Backend
افتح Terminal وادخل إلى مجلد backend:

cd backend

ثبّت المكتبات المطلوبة:

pip install -r requirements.txt

شغّل الخادم:

python app.py

إذا اشتغل بنجاح، ستظهر رسالة تشير إلى تشغيل الخادم على 
http://127.0.0.1:5000.

2. 
تشغيل الـ Frontend
افتح Terminal آخر وادخل إلى مجلد frontend:

cd frontend

شغّل خادم الـ Frontend:

python -m http.server 5500

افتح المتصفح على الرابط:

http://127.0.0.1:5500/index.html

3. 
طريقة التشغيل الكاملة خطوة بخطوة
تشغيل الـ Backend:

cd backend

pip install -r requirements.txt

python app.py

تشغيل الـ Frontend:

cd frontend

python -m http.server 5500

فتح المتصفح على:

http://127.0.0.1:5500/index.html


4. 
تأكد من تشغيل الـ Backend أولًا


لا تنسى تشغيل الـ Backend أولًا، ثم بعد ذلك شغّل الـ Frontend.

كيفية إعداد مفتاح Gemini API
قم بنسخ المفتاح الذي حصلت عليه:

AlzaSyAPdtokpnY3XmddMbSrCYDACg5of_mQ2m4

افتح Terminal.

اكتب الأمر التالي لتعيين المفتاح كمتغير بيئة في Windows:

setx GEMINI_API_KEY “AlzaSyAPdtokpnY3XmddMbSrCYDACg5of_mQ2m4”

بعد تعيين المفتاح، أغلق Terminal أو VS Code وأعد فتحه.

للتحقق من أنه تم حفظ المفتاح بشكل صحيح:

echo %GEMINI_API_KEY%

إذا ظهر المفتاح، فهذا يعني أنه تم حفظه بشكل صحيح.