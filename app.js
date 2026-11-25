const textArea = document.getElementById('emailText');
const body = document.getElementById('resultsBody');
const exportBtn = document.getElementById('exportBtn');
const notice = document.getElementById('notice');
let employees = [];

textArea.addEventListener('input', () => {
  document.getElementById('charCount').textContent = `${textArea.value.length.toLocaleString('ar-EG')} حرف`;
});

document.getElementById('loadExample').addEventListener('click', () => {
  textArea.value = `السادة فريق الموارد البشرية،
يرجى تحديث بيانات الموظفين التالية:

الاسم: أحمد محمد علي
المسمى الوظيفي: مهندس نظم
رقم الهاتف: 01012345678
البريد الإلكتروني: ahmed.ali@example.com

Name: Sara Hassan
Job Title: HR Specialist
Phone: +20 100 555 1212
Email: sara.hassan@example.com`;
  textArea.dispatchEvent(new Event('input'));
});

function normalizeDigits(value) {
  return value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
              .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
}
function normalizeText(value) {
  // Supports both real line breaks and literal "\n" pasted as text.
  return value.replace(/\\r\\n|\\n|\\r/g, '\n').replace(/\r\n?/g, '\n');
}
function clean(value) {
  return (value || '').replace(/^[\s:：،,؛;-]+|[\s،,؛;]+$/g, '').trim();
}
function findLabeled(text, labels) {
  const lines = text.split(/\n/);
  const pattern = new RegExp('^\\s*(?:' + labels.join('|') + ')\\s*[:：-]\\s*(.*?)\\s*$', 'i');
  for (const line of lines) {
    const match = line.match(pattern);
    if (match && match[1]) return clean(match[1]);
  }
  return '';
}
function extractEmail(text) {
  return (text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [''])[0];
}
function extractPhone(text) {
  const normalized = normalizeDigits(text);
  const matches = normalized.match(/\+?\d[\d\s().-]{7,}\d/g) || [];
  const candidate = matches.map(clean).find(v => {
    const digits = v.replace(/\D/g, '');
    return digits.length >= 9 && digits.length <= 15;
  });
  return candidate || '';
}
function inferName(text, email) {
  const labeled = findLabeled(text, ['الاسم الكامل', 'اسم الموظف', 'الاسم', 'Employee Name', 'Full Name', 'Name']);
  if (labeled) return labeled;
  if (email) {
    const local = email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\d+/g, '').trim();
    if (local.length > 2) return local.replace(/\b\w/g, c => c.toUpperCase());
  }
  return '';
}
function inferJob(text) {
  return findLabeled(text, ['المسمى الوظيفي', 'الوظيفة', 'المنصب', 'Job Title', 'Position', 'Title', 'Role']);
}
function parseText(rawText) {
  const text = normalizeText(rawText);
  const blocks = text.split(/\n\s*\n+/).map(s => s.trim()).filter(Boolean);
  const records = [];
  for (const block of blocks) {
    const email = extractEmail(block);
    const phone = extractPhone(block);
    const name = inferName(block, email);
    const job = inferJob(block);
    if (name || email || phone || job) records.push({name, phone, job, email});
  }
  if (!records.length) {
    const email = extractEmail(text), phone = extractPhone(text);
    const name = inferName(text, email), job = inferJob(text);
    if (name || email || phone || job) records.push({name, phone, job, email});
  }
  return records;
}
function showNotice(message) {
  notice.textContent = message;
  notice.classList.add('show');
  window.setTimeout(() => notice.classList.remove('show'), 4500);
}
function render() {
  body.innerHTML = '';
  if (!employees.length) {
    body.innerHTML = '<tr class="empty-row"><td colspan="6">لا توجد بيانات حالياً. الصق النص ثم اضغط «استخراج البيانات».</td></tr>';
  } else {
    employees.forEach((emp, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${index + 1}</td>
        <td><input aria-label="الاسم" value="${escapeAttr(emp.name)}" data-index="${index}" data-field="name"></td>
        <td><input aria-label="رقم الهاتف" value="${escapeAttr(emp.phone)}" data-index="${index}" data-field="phone"></td>
        <td><input aria-label="المسمى الوظيفي" value="${escapeAttr(emp.job)}" data-index="${index}" data-field="job"></td>
        <td><input aria-label="البريد الإلكتروني" value="${escapeAttr(emp.email)}" data-index="${index}" data-field="email"></td>
        <td><button class="delete-btn" data-delete="${index}" aria-label="حذف الموظف">حذف</button></td>`;
      body.appendChild(tr);
    });
  }
  document.getElementById('recordCount').textContent = `${employees.length.toLocaleString('ar-EG')} موظف`;
  exportBtn.disabled = employees.length === 0;
}
function escapeAttr(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
document.getElementById('extractBtn').addEventListener('click', () => {
  const value = textArea.value.trim();
  if (!value) return showNotice('من فضلك الصق نص البريد الإلكتروني أولاً.');
  const found = parseText(value);
  if (!found.length) return showNotice('لم نتمكن من تحديد بيانات واضحة. جرّب نصاً يحتوي على الاسم أو الهاتف أو البريد الإلكتروني.');
  employees = [...employees, ...found];
  render();
  showNotice(`تم استخراج ${found.length} سجل/سجلات. راجع البيانات قبل التصدير.`);
});
body.addEventListener('input', event => {
  const input = event.target;
  if (input.matches('input[data-field]')) employees[Number(input.dataset.index)][input.dataset.field] = input.value;
});
body.addEventListener('click', event => {
  const index = event.target.dataset.delete;
  if (index !== undefined) { employees.splice(Number(index), 1); render(); }
});
document.getElementById('addRowBtn').addEventListener('click', () => {
  employees.push({name:'', phone:'', job:'', email:''});
  render();
  body.querySelector('tr:last-child input')?.focus();
});
document.getElementById('clearBtn').addEventListener('click', () => {
  employees = []; render(); showNotice('تم مسح جميع النتائج.');
});
exportBtn.addEventListener('click', () => {
  if (!employees.length) return;
  if (typeof XLSX === 'undefined') return showNotice('تعذر تحميل مكتبة Excel. تحقق من اتصال الإنترنت ثم أعد تحميل الصفحة.');
  const rows = employees.map((e, i) => ({
    'م': i + 1, 'الاسم': e.name, 'رقم الهاتف': e.phone,
    'المسمى الوظيفي': e.job, 'البريد الإلكتروني': e.email
  }));
  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet['!cols'] = [{wch:6},{wch:28},{wch:20},{wch:25},{wch:32}];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'بيانات الموظفين');
  XLSX.writeFile(book, `بيانات_الموظفين_${new Date().toISOString().slice(0,10)}.xlsx`);
});
render();
