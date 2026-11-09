-- =====================================================================
-- SecureDrive - 0003_faq_chatbot.sql
-- Run once in Supabase: SQL Editor > New query > paste all > Run.
-- Safe to re-run (idempotent). One transaction: all or nothing.
--
-- What this adds
--   faqs        : the questions and answers the Support chatbot uses
--                 (English + Hindi). The CRM will edit this table, so your
--                 client can add, change or hide answers WITHOUT an app update.
--   faq_misses  : every question the chatbot could not answer (or an answer
--                 the user said did not help). Read it to learn which FAQs
--                 to add next.
--   Starter FAQs are inserted only if the faqs table is empty.
--
-- How the chatbot matches a question (no AI cost, works offline once loaded):
--   it compares the words the user typed with the "keywords" and the question
--   text of every active FAQ. Add the words people might type, in English,
--   Hindi or Hinglish, to the keywords column to make matching better.
-- =====================================================================

begin;

create table if not exists public.faqs (
  id          uuid primary key default gen_random_uuid(),
  category    text,
  question_en text not null,
  question_hi text,
  answer_en   text not null,
  answer_hi   text,
  -- Comma separated words people might type: English, Hindi and Hinglish.
  keywords    text not null default '',
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.faq_misses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.users (id) on delete cascade,
  question   text not null,
  reason     text not null default 'no_match' check (reason in ('no_match', 'not_helpful')),
  faq_id     uuid references public.faqs (id) on delete set null,
  is_handled boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists faqs_active_sort_idx   on public.faqs (is_active, sort_order);
create index if not exists faq_misses_created_idx on public.faq_misses (created_at desc);

drop trigger if exists faqs_set_updated_at on public.faqs;
create trigger faqs_set_updated_at before update on public.faqs
  for each row execute function public.set_updated_at();

-- ---- Row Level Security ----------------------------------------------
alter table public.faqs       enable row level security;
alter table public.faq_misses enable row level security;

revoke all on public.faqs       from anon;
revoke all on public.faq_misses from anon;

drop policy if exists faqs_staff_all          on public.faqs;
drop policy if exists faqs_read_active        on public.faqs;
drop policy if exists faq_misses_staff_all    on public.faq_misses;
drop policy if exists faq_misses_insert_own   on public.faq_misses;

-- Staff (advisor + team) can do everything.
create policy faqs_staff_all on public.faqs
  for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

create policy faq_misses_staff_all on public.faq_misses
  for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- Any logged-in user can read ACTIVE faqs (hidden ones stay hidden).
create policy faqs_read_active on public.faqs
  for select to authenticated using (is_active);

-- A user can only log a miss for themselves, and cannot read the log.
create policy faq_misses_insert_own on public.faq_misses
  for insert to authenticated
  with check (
    user_id = (select public.current_user_id())
    and char_length(question) <= 500
  );

-- ---- Starter FAQs (only when the table is empty) ----------------------
do $$
begin
  if not exists (select 1 from public.faqs) then
    insert into public.faqs (category, sort_order, question_en, question_hi, answer_en, answer_hi, keywords) values

    ('policies', 10,
     'How do I add my own policy?',
     'मैं अपनी पॉलिसी कैसे जोड़ूँ?',
     'Tap the Add Policy button in the middle of the bottom bar. Choose the policy type, pick or type your insurance company, enter the policy number and the end date, then tap Save policy. The start date, premium and documents are optional.',
     'नीचे बीच में दिए पॉलिसी जोड़ें बटन पर टैप करें। पॉलिसी का प्रकार चुनें, बीमा कंपनी चुनें या लिखें, पॉलिसी नंबर और समाप्ति की तारीख डालें, फिर पॉलिसी सेव करें पर टैप करें। शुरू की तारीख, प्रीमियम और दस्तावेज़ वैकल्पिक हैं।',
     'add, new, create, save, enter, register, jodna, jodein, jodo, naya, nayi, जोड़ें, जोड़ना, जोड़ो, नई, नयी, सेव'),

    ('policies', 60,
     'How do I edit or delete a policy I added?',
     'मैंने जो पॉलिसी जोड़ी है उसे कैसे बदलूँ या हटाऊँ?',
     'Open the policy from Home or My Policies. On the policy page you will find the Edit and Delete policy buttons. You can only change or delete policies that you added yourself.',
     'होम या मेरी पॉलिसियाँ से पॉलिसी खोलें। पॉलिसी के पेज पर बदलें और पॉलिसी हटाएँ बटन मिलेंगे। आप सिर्फ़ वही पॉलिसियाँ बदल या हटा सकते हैं जो आपने ख़ुद जोड़ी हैं।',
     'edit, change, update, modify, delete, remove, correct, wrong, mistake, badlo, badalna, hatana, hatao, galat, sudhar, बदलें, बदलना, हटाएँ, हटाना, गलत, सुधार'),

    ('policies', 70,
     'Why can I not edit a policy my advisor added?',
     'सलाहकार की जोड़ी हुई पॉलिसी मैं क्यों नहीं बदल सकता?',
     'Policies uploaded by your advisor are managed by them, so the Edit and Delete buttons are hidden. If something is wrong, use Write to us in Support and tell us what needs to be corrected.',
     'सलाहकार की अपलोड की हुई पॉलिसियाँ वही संभालते हैं, इसलिए बदलें और हटाएँ बटन नहीं दिखते। अगर कुछ ग़लत है तो सहायता में हमें लिखें में बताइए कि क्या सुधारना है।',
     'advisor, agent, locked, cannot, cant, edit, change, wrong, galat, correct, सलाहकार, एडवाइजर, एजेंट, बदल, ग़लत'),

    ('policies', 80,
     'My advisor uploaded my policy but I cannot see it',
     'मेरे सलाहकार ने पॉलिसी अपलोड की है पर मुझे दिख नहीं रही',
     'Make sure you logged in with the same mobile number your advisor has on record. Pull down on the Home screen to refresh. If it still does not appear, contact us from Support with your policy number.',
     'देखें कि आपने वही मोबाइल नंबर इस्तेमाल किया है जो आपके सलाहकार के पास दर्ज है। होम स्क्रीन पर नीचे खींचकर रिफ्रेश करें। फिर भी न दिखे तो पॉलिसी नंबर के साथ सहायता से हमसे संपर्क करें।',
     'missing, showing, dikh, dikhai, dikhti, uploaded, advisor, agent, appear, mobile number, refresh, दिख, दिखाई, गायब, नंबर, रिफ्रेश, अपलोड'),

    ('renewals', 30,
     'What does Expiring Soon mean, and how will I know when to renew?',
     'जल्द समाप्त का क्या मतलब है, और नवीनीकरण का पता कैसे चलेगा?',
     'A policy is marked Expiring Soon when it ends within 30 days. Home also highlights policies due within 60 days. Renewal alerts and offers from your advisor appear in the Updates tab, and the bell icon shows a dot when something is unread.',
     'जो पॉलिसी 30 दिनों के भीतर समाप्त हो रही हो उसे जल्द समाप्त दिखाया जाता है। होम पर 60 दिनों में आने वाली पॉलिसी भी ऊपर दिखती है। सलाहकार के नवीनीकरण अलर्ट और ऑफ़र अपडेट टैब में आते हैं, और कुछ अनपढ़ा हो तो घंटी पर बिंदु दिखता है।',
     'expiring, expire, expires, expiry, renewal, renew, reminder, remind, alert, due, notification, notify, soon, yaad, समाप्त, नवीनीकरण, रिन्यू, रिमाइंडर, याद, सूचना, अलर्ट, एक्सपायर, रिन्यूअल'),

    ('renewals', 20,
     'How do I get a quote or renew my policy?',
     'कोट कैसे माँगूँ या पॉलिसी का नवीनीकरण कैसे करूँ?',
     'Tap Request Quote on a policy card or on its detail page. Your advisor receives the request and will get in touch with you.',
     'पॉलिसी कार्ड या उसके विवरण पेज पर कोट माँगें पर टैप करें। आपके सलाहकार को आपका अनुरोध मिल जाता है और वे आपसे संपर्क करेंगे।',
     'quote, quotation, renew, renewal, price, premium, offer, discount, kot, कोट, रिन्यू, रिन्यूअल, नवीनीकरण, प्रीमियम, छूट, कीमत'),

    ('renewals', 90,
     'My policy shows Expired. What should I do?',
     'मेरी पॉलिसी समाप्त दिख रही है। मुझे क्या करना चाहिए?',
     'A policy is Expired once its end date has passed. Tap Request Quote on it so your advisor can help you renew. Renewing quickly avoids a gap in your cover.',
     'समाप्ति की तारीख निकल जाने पर पॉलिसी समाप्त दिखती है। उस पर कोट माँगें पर टैप करें ताकि आपके सलाहकार नवीनीकरण में मदद कर सकें। जल्दी नवीनीकरण करने से सुरक्षा में रुकावट नहीं आती।',
     'expired, lapsed, lapse, ended, over, finished, renew, khatam, samapt, समाप्त, खत्म, ख़त्म, लैप्स, एक्सपायर'),

    ('documents', 40,
     'Which documents can I upload and how?',
     'मैं कौन से दस्तावेज़ और कैसे अपलोड कर सकता हूँ?',
     'You can attach PDF, JPG, PNG or WebP files up to 10 MB each. While adding a policy you can attach up to 5 files, or add more later from the Documents card on the policy page. You can also take a photo of a document with the camera. Documents can be added to policies you added yourself.',
     'आप 10 MB तक की PDF, JPG, PNG या WebP फ़ाइलें जोड़ सकते हैं। पॉलिसी जोड़ते समय 5 फ़ाइलें तक जोड़ी जा सकती हैं, और बाद में पॉलिसी पेज के दस्तावेज़ कार्ड से और जोड़ सकते हैं। कैमरे से दस्तावेज़ की फ़ोटो भी ले सकते हैं। दस्तावेज़ उन्हीं पॉलिसियों में जोड़े जा सकते हैं जो आपने ख़ुद जोड़ी हैं।',
     'document, documents, upload, file, pdf, photo, camera, image, attach, size, dastavez, दस्तावेज, दस्तावेज़, अपलोड, फाइल, फ़ाइल, फोटो, कैमरा'),

    ('documents', 100,
     'How do I view or share my policy details?',
     'पॉलिसी का विवरण कैसे देखूँ या शेयर करूँ?',
     'Open the policy and scroll to the Documents card to open an uploaded file. Tap Share details to send the policy name, insurer, number and end date through any app.',
     'पॉलिसी खोलें और अपलोड की गई फ़ाइल खोलने के लिए दस्तावेज़ कार्ड तक स्क्रॉल करें। पॉलिसी का नाम, कंपनी, नंबर और समाप्ति की तारीख किसी भी ऐप से भेजने के लिए विवरण शेयर करें पर टैप करें।',
     'view, open, share, send, copy, details, dekhna, bhejna, देखें, देखना, शेयर, भेजें, भेजना, विवरण'),

    ('policies', 110,
     'Which types of policies can I add?',
     'मैं किस तरह की पॉलिसियाँ जोड़ सकता हूँ?',
     'You can add Car, Two Wheeler, Health, Term and Other policies. Choose Other for any insurance that is not listed, such as home or travel insurance.',
     'आप कार, दोपहिया, स्वास्थ्य, टर्म और अन्य पॉलिसियाँ जोड़ सकते हैं। जो बीमा सूची में नहीं है, जैसे घर या यात्रा का बीमा, उसके लिए अन्य चुनें।',
     'types, type, kind, category, car, bike, two wheeler, health, term, life, home, travel, motor, gaadi, प्रकार, कार, दोपहिया, स्वास्थ्य, टर्म, अन्य, गाड़ी'),

    ('support', 50,
     'I need help with a claim',
     'मुझे क्लेम में मदद चाहिए',
     'Open Support, choose the Claim option under Write to us, describe what happened and send the request. Your advisor will contact you. For urgent cases use the Call or WhatsApp buttons, and please also inform your insurer as soon as possible.',
     'सहायता खोलें, हमें लिखें में क्लेम वाला विकल्प चुनें, बताइए क्या हुआ और अनुरोध भेजें। आपके सलाहकार आपसे संपर्क करेंगे। ज़रूरी मामलों में कॉल या WhatsApp बटन इस्तेमाल करें, और अपनी बीमा कंपनी को भी जल्द से जल्द सूचित करें।',
     'claim, accident, damage, hospital, cashless, reimbursement, settle, settlement, dawa, durghatna, क्लेम, दावा, दुर्घटना, अस्पताल, कैशलेस, नुकसान'),

    ('support', 120,
     'Can someone call me back?',
     'क्या कोई मुझे वापस कॉल कर सकता है?',
     'Yes. In Support choose the Call me option under Write to us, add a short note with a good time to call, and send it. You can also call us directly with the Call button.',
     'जी हाँ। सहायता में हमें लिखें के अंदर मुझे कॉल करें विकल्प चुनें, कॉल के लिए सही समय का छोटा सा संदेश लिखें और भेज दें। आप कॉल बटन से सीधे भी कॉल कर सकते हैं।',
     'call, callback, phone, talk, speak, contact, baat, phone karo, कॉल, फोन, फ़ोन, बात, संपर्क'),

    ('account', 130,
     'How do I change the language?',
     'भाषा कैसे बदलूँ?',
     'Go to Profile and use the Language switch to choose English or Hindi. The whole app changes at once.',
     'प्रोफ़ाइल में जाकर भाषा स्विच से English या हिंदी चुनें। पूरा ऐप एक साथ बदल जाता है।',
     'language, hindi, english, translate, bhasha, hindi mein, भाषा, हिंदी, हिन्दी, अंग्रेज़ी, अंग्रेजी'),

    ('account', 140,
     'How do I delete my account?',
     'मैं अपना खाता कैसे हटाऊँ?',
     'Go to Profile and tap Delete account. This permanently removes your account, policies and documents and cannot be undone.',
     'प्रोफ़ाइल में जाकर खाता हटाएँ पर टैप करें। इससे आपका खाता, पॉलिसियाँ और दस्तावेज़ हमेशा के लिए हट जाते हैं और इसे वापस नहीं किया जा सकता।',
     'delete, remove, account, deactivate, close, data, khata, hatana, hatao, खाता, हटाएँ, हटाना, डिलीट, डेटा, अकाउंट'),

    ('account', 150,
     'Is my data and are my documents safe?',
     'क्या मेरा डेटा और दस्तावेज़ सुरक्षित हैं?',
     'Your documents are kept in private storage and are opened only through a short-lived secure link. Your information is visible only to you and the team that supports you. You can delete your account and data from Profile at any time.',
     'आपके दस्तावेज़ निजी स्टोरेज में रहते हैं और सिर्फ़ थोड़े समय के सुरक्षित लिंक से खुलते हैं। आपकी जानकारी सिर्फ़ आपको और आपकी मदद करने वाली टीम को दिखती है। आप प्रोफ़ाइल से कभी भी अपना खाता और डेटा हटा सकते हैं।',
     'safe, safety, secure, security, privacy, private, protect, confidential, data, suraksha, surakshit, gopniyata, सुरक्षित, सुरक्षा, गोपनीयता, प्राइवेसी, निजी, डेटा');
  end if;
end $$;

commit;

-- Check: should list the starter FAQs (17 rows after a first run).
select sort_order, category, question_en, is_active from public.faqs order by sort_order;
