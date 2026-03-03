import './style.css';
import OpenAI from 'openai';

// Initialize OpenAI client with proper error handling
let openai;

function initializeOpenAI() {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  console.log('🔑 Checking API key...', apiKey ? 'API key found (length: ' + apiKey.length + ')' : 'API key missing');
  
  if (!apiKey) {
    console.error('❌ OpenAI API key is missing! Please add VITE_OPENAI_API_KEY to your .env file');
    return false;
  }
  
  try {
    openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true
    });
    console.log('✅ OpenAI client initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize OpenAI client:', error);
    return false;
  }
}

// Update constants
const GENERATION_INTERVAL = 12000; // 12 seconds between generations
const MAX_DIALOGUE_LENGTH = 16; // Keep more lines visible for slower fade
const TYPING_BASE_SPEED = 50;      // Slightly faster base typing
const PAUSE_BETWEEN_LINES = 1500;  // Longer pause between lines
const FADE_DURATION = 8000;        // Much longer fade transitions like slow memories
const BREATHING_SPEED = 0.005;     // Even slower breathing animation
const FLOATING_SPEED = 0.004;      // Even slower floating animation

// Remove scroll-related variables
let isLoading = true;
let sampleSound;
let isSoundPlaying = false;
let lastGenerationTime = 0;
let generationStarted = false; // Track if generation has been started by user

// Fade system variables
let currentGeneration = []; // Current generation being displayed
let generationStartTime = 0; // When current generation started
let generationAlpha = 0; // Alpha for current generation
let showingInterAnimation = false; // Show spiral between generations
let interAnimationStartTime = 0; // When inter-animation started
let generationError = null; // Error message when generation fails (e.g. missing API key)
const GENERATION_CYCLE = 10000; // 10 seconds between generations (shorter)
const FADE_IN_TIME = 2800;  // 2.8 s slow fade in
const DISPLAY_TIME = 600;   // 0.6 s fully visible
const FADE_OUT_TIME = 3200; // 3.2 s slow fade out
const PAUSE_AFTER_FADEOUT = 1600; // 1.6 s pause after fade out
const LINE_HEIGHT = 84; // Reduced by 30%
const FONT_SIZE = 67; // Reduced by 30%

// Scrolling layout - text appears at bottom and scrolls up
const CANVAS_HEIGHT = 700;
const BOTTOM_MARGIN = 100; // Space from bottom of canvas
const TOP_FADE_ZONE = 150; // Height of fade zone at top

// Add language configurations
const LANGUAGES = {
  'Español': {
    title: ["—¿Olvida usted algo?", "—Ojalá."],
    prompt: `Crea un intercambio minimalista muy corto (2-4 palabras cada uno) en español. Usa guiones largos. Que se sienta como fragmentos:

—¿Dónde lo dejaste?
—En los espacios entre recuerdos.

Continúa con un breve intercambio. Mantén cada línea bajo 4 palabras. Enfócate en la pérdida, la memoria, la ausencia.`
  },
  'English': {
    title: ["—Forgettin' something?", "—If only."],
    prompt: `Create a very short, minimalist exchange (2-4 words each). Use em dashes. Make it feel like fragments:

—Where did you leave it?
—In the spaces between memories.

Continue with just one brief exchange. Keep each line under 4 words. Focus on loss, memory, absence.`
  },
  'Français': {
    title: ["—Tu oublies quelque chose ?", "—Si seulement."],
    prompt: `Créez un très court échange minimaliste (2-4 mots chacun) en français. Utilisez des tirets. Que cela ressemble à des fragments:

—Où l'as-tu laissé ?
—Dans les espaces entre les souvenirs.

Continuez avec un bref échange. Gardez chaque ligne sous 4 mots. Concentrez-vous sur la perte, la mémoire, l'absence.`
  },
  'Deutsch': {
    title: ["—Vergisst du etwas?", "—Wenn nur."],
    prompt: `Erstelle einen sehr kurzen, minimalistischen Austausch (2-4 Wörter) auf Deutsch. Verwende Gedankenstriche. Es soll sich wie Fragmente anfühlen:

—Wo hast du es gelassen?
—In den Räumen zwischen Erinnerungen.

Fahre mit einem kurzen Austausch fort. Halte jede Zeile unter 4 Wörtern. Fokussiere dich auf Verlust, Erinnerung, Abwesenheit.`
  },
  'Italiano': {
    title: ["—Dimenticando qualcosa?", "—Se solo."],
    prompt: `Crea uno scambio minimalista molto breve (2-4 parole ciascuno) in italiano. Usa i trattini. Fallo sentire come frammenti:

—Dove l'hai lasciato?
—Negli spazi tra i ricordi.

Continua con un breve scambio. Mantieni ogni riga sotto le 4 parole. Concentrati su perdita, memoria, assenza.`
  },
  'Português': {
    title: ["—Esquecendo algo?", "—Se ao menos."],
    prompt: `Crie uma troca minimalista muito curta (2-4 palavras cada) em português. Use travessões. Faça parecer fragmentos:

—Onde você deixou?
—Nos espaços entre memórias.

Continue com uma breve troca. Mantenha cada linha com menos de 4 palavras. Foque em perda, memória, ausência.`
  },
  '日本語': {
    title: ["—何か忘れてる？", "—ただそれだけ。"],
    prompt: `日本語で非常に短い、ミニマルな会話（各2-4語）を作成してください。ダッシュを使用し、断片的な感じにしてください：

—どこに置いた？
—記憶の間の空間に。

短い会話を続けてください。各行を4語以下に保ってください。喪失、記憶、不在に焦点を当ててください。`
  },
  '中文': {
    title: ["—您忘了？", "—但愿如此！"],
    prompt: `用中文创建一个非常简短的对话 (每句2-4个字)。使用破折号。让它感觉像片段：

—你把它放在哪里？
—在记忆的缝隙间。

继续一个简短的对话。每行保持在4个字以内。关注失落、记忆、缺失。`
  },
  '한국어': {
    title: ["—뭔가 잊으셨나요?", "—그저 그뿐."],
    prompt: `한국어로 매우 짧은 미니멀한 대화(각 2-4단어)를 만드세요. 대시를 사용하고 단편적인 느낌이 들도록 하세요:

—어디에 두었나요?
—기억 사이의 공간에.

짧은 대화를 이어가세요. 각 줄을 4단어 이하로 유지하세요. 상실, 기억, 부재에 초점을 맞추세요.`
  },
  'Русский': {
    title: ["—Что-то забыла?", "—Если бы."],
    prompt: `Создайте очень короткий, минималистичный обмен (2-4 слова каждый) на русском языке. Используйте тире. Пусть это звучит как фрагменты:

—Где ты это оставила?
—В пространствах между воспоминаниями.

Продолжите краткий обмен. Держите каждую строку менее 4 слов. Сосредоточьтесь на потере, памяти, отсутствии.`
  },
  'Українська': {
    title: ["—Щось забули?", "—Якби лише."],
    prompt: `Створіть дуже короткий, мінімалістичний обмін (2-4 слова кожне) українською. Використовуйте тире. Нехай це звучить як фрагменти:

—Де ти це залишив?
—У просторах між спогадами.

Продовжте короткий обмін. Тримайте кожен рядок менше 4 слів. Зосередьтесь на втраті, пам'яті, відсутності.`
  },
  'العربية': {
    title: ["—هل نسيت شيئاً؟", "—لو فقط."],
    prompt: `أنشئ حواراً قصيراً للغاية (2-4 كلمات لكل سطر) بالعربية. استخدم الشرطات. اجعله يبدو كأجزاء متقطعة:

—أين تركته؟
—في المساحات بين الذكريات.

واصل بتبادل قصير. حافظ على كل سطر تحت 4 كلمات. ركز على الفقدان والذاكرة والغياب.`
  },
  'हिंदी': {
    title: ["—कुछ भूल गए?", "—काश ऐसा होता।"],
    prompt: `हिंदी में एक बहुत छोटा, न्यूनतम संवाद बनाएं (प्रत्येक 2-4 शब्द)। डैश का उपयोग करें। इसे टुकड़ों की तरह महसूस कराएं:

—कहाँ छोड़ दिया?
—यादों के बीच की जगहों में।

एक छोटे संवाद के साथ जारी रखें। प्रत्येक पंक्ति को 4 शब्दों से कम रखें। खो जाने, स्मृति, अनुपस्थिति पर ध्यान दें।`
  },
  'Ελληνικά': {
    title: ["—Ξεχνάς κάτι;", "—Μακάρι μόνο."],
    prompt: `Δημιούργησε μια πολύ σύντομη, μινιμαλιστική συνομιλία (2-4 λέξεις η καθεμία) στα ελληνικά. Χρησιμοποίησε παύλες. Κάνε το να μοιάζει με αποσπάσματα:

—Πού το άφησες;
—Στα κενά μεταξύ αναμνήσεων.

Συνέχισε με μια σύντομη ανταλλαγή. Κράτησε κάθε γραμμή κάτω από 4 λέξεις. Εστίασε στην απώλεια, τη μνήμη, την απουσία.`
  },
  'Türkçe': {
    title: ["—Bir şey mi unuttun?", "—Keşke."],
    prompt: `Türkçe'de çok kısa, minimalist bir diyalog oluşturun (her biri 2-4 kelime). Kısa çizgi kullanın. Parçalar gibi hissettirin:

—Nerede bıraktın?
—Anıların arasındaki boşluklarda.

Kısa bir alışverişle devam edin. Her satırı 4 kelimenin altında tutun. Kayıp, hafıza, yokluk üzerine odaklanın.`
  },
  'Polski': {
    title: ["—Coś zapomniałeś?", "—Gdyby tylko."],
    prompt: `Stwórz bardzo krótką, minimalistyczną wymianę (2-4 słowa każda) po polsku. Użyj myślników. Niech brzmi jak fragmenty:

—Gdzie to zostawiłeś?
—W przestrzeniach między wspomnieniami.

Kontynuuj krótką wymianę. Zachowaj każdą linię poniżej 4 słów. Skup się na stracie, pamięci, nieobecności.`
  },
  'Nederlands': {
    title: ["—Iets vergeten?", "—Was het maar zo."],
    prompt: `Maak een zeer korte, minimalistische uitwisseling (2-4 woorden elk) in het Nederlands. Gebruik gedachtestreepjes. Laat het aanvoelen als fragmenten:

—Waar heb je het gelaten?
—In de ruimtes tussen herinneringen.

Ga door met een korte uitwisseling. Houd elke regel onder 4 woorden. Focus op verlies, geheugen, afwezigheid.`
  },
  'Svenska': {
    title: ["—Glömmer du något?", "—Om bara."],
    prompt: `Skapa ett mycket kort, minimalistiskt utbyte (2-4 ord vardera) på svenska. Använd tankstreck. Låt det kännas som fragment:

—Var lämnade du det?
—I utrymmena mellan minnena.

Fortsätt med ett kort utbyte. Håll varje rad under 4 ord. Fokusera på förlust, minne, frånvaro.`
  },
  'Čeština': {
    title: ["—Zapomněl jsi něco?", "—Kéž by jen."],
    prompt: `Vytvořte velmi krátkou, minimalistickou výměnu (2-4 slova každá) v češtině. Použijte pomlčky. Ať to působí jako fragmenty:

—Kde jsi to nechal?
—V prostorách mezi vzpomínkami.

Pokračujte krátkou výměnou. Udržujte každý řádek pod 4 slovy. Zaměřte se na ztrátu, paměť, nepřítomnost.`
  },
  'Tiếng Việt': {
    title: ["—Quên gì à?", "—Giá mà thế."],
    prompt: `Tạo một cuộc trao đổi rất ngắn, tối giản (mỗi câu 2-4 từ) bằng tiếng Việt. Sử dụng dấu gạch ngang. Làm cho nó có cảm giác như những mảnh ghép:

—Bạn để nó đâu?
—Trong khoảng trống giữa ký ức.

Tiếp tục với một cuộc trao đổi ngắn. Giữ mỗi dòng dưới 4 từ. Tập trung vào mất mát, ký ức, vắng mặt.`
  },
  'ไทย': {
    title: ["—ลืมอะไรหรือเปล่า?", "—ถ้าเพียงแค่นั้น"],
    prompt: `สร้างบทสนทนาสั้นๆ แบบมินิมอล (2-4 คำต่อบรรทัด) ในภาษาไทย ใช้เครื่องหมายขีด ให้รู้สึกเหมือนเป็นส่วนๆ:

—คุณทิ้งมันไว้ที่ไหน?
—ในช่องว่างระหว่างความทรงจำ

ดำเนินการต่อด้วยบทสนทนาสั้นๆ รักษาให้แต่ละบรรทัดมีไม่เกิน 4 คำ มุ่งเน้นเรื่องการสูญเสีย ความทรงจำ การขาดหาย`
  },
  'Kiswahili': {
    title: ["—Umekosea kitu?", "—Laiti."],
    prompt: `Tengeneza mabadiliko mafupi, maana (maneno 2-4 kila mmoja) kwa Kiswahili. Tumia mstari mrefu. Lihisi kama vipande:

—Umeuacha wapi?
—Kwenye nafasi kati ya kumbukumbu.

Endelea na mabadiliko mafupi. Weka kila mstari chini ya maneno 4. Lenga hasara, kumbukumbu, kutokuwepo.`
  },
  'Yoruba': {
    title: ["—Ṣe o gbàgbé nǹkan?", "—Bóyá."],
    prompt: `Ṣe àkójọpọ kukuru, aláìlòpọ (ọrọ 2-4 kọọkan) ní èdè Yorùbá. Lo àfojúrí. Jẹ kó rúwé bí àwọn apá:

—Níbo ni o fi sí?
—Nínú àwọn ààfín láàárín ìrántí.

Tẹsiwaju pẹlu àkójọpọ kukuru. Jẹ ọrọ kọọkan kéré ju 4. Fojú sórí ìpadanu, ìrántí, àìsí.`
  },
  'Amharic': {
    title: ["—አንድ ነገር ረሱ?", "—እንደሆነ ኖሮ."],
    prompt: `በአማርኛ በጣም አጭር እና ዝቅተኛ ልውውጥ (2-4 ቃላት እያንዳንዱ) ፍጠር። ረጅም መስመር ተጠቀም። እንደ ቁርጥራጮች ይሰማ።

—የት ጣለው?
—በመሰናዶዎች መካከል በቦታዎች።

በአጭር ልውውጥ ቀጥል። እያንዳንዱን መስመር ከ4 ቃላት በታች ይጠብቅ። በማጣት፣ በማስታወስ፣ በማይገኝነት ላይ ተጣምር።`
  },
  'isiZulu': {
    title: ["—Ukhohliwe into?", "—Kube ngabe."],
    prompt: `Dala ukushintshanisa okufushane, okuncane (amagama 2-4 ngamunye) ngesiZulu. Sebenzisa umugqa omude. Kuzwe njengeziqephu:

—Uyibekephi?
—Ezikhaleni phakathi kwezinkumbulo.

Qhubeka nokushintshanisa okufushane. Gcina umugqa ngamunye ngaphansi kwamagama ama-4. Gxila ekulahlekelweni, ekukhumbuleni, ekungabikho.`
  }
};

// Color system — grayscale only (black, white, gray)
const COLORS = {
  // Base palette (grayscale)
  base: {
    white: '#f5f5f5',
    black: '#000000',
    dark: '#111111',
    midDark: '#2a2a2a',
    mid: '#666666',
    midLight: '#999999',
    light: '#b0b0b0',
    offWhite: '#e8e8e8'
  },
  
  // Functional colors
  theme: {
    background: '#111111',
    text: {
      primary: '#f5f5f5',
      secondary: '#999999',
      accent: '#b0b0b0'
    },
    interactive: {
      hover: '#999999',
      active: '#444444',
      focus: '#666666'
    }
  },
  
  // State-based combinations
  states: {
    typing: {
      color: '#999999',
      shadow: '#444444'
    },
    loading: {
      primary: '#666666',
      secondary: '#f5f5f5'
    },
    fading: {
      start: '#f5f5f5',
      end: '#444444'
    }
  },
  
  // Performance mode theme (dark grayscale)
  performance: {
    background: '#000000',
    text: {
      primary: '#ffffff',
      secondary: '#cccccc',
      accent: '#ffffff'
    },
    loading: {
      primary: '#ffffff',
      secondary: '#666666'
    }
  }
};

// Change default language to use the selected language from landing page
let currentLanguage = localStorage.getItem('selectedLanguage') || 'Español';
let isStarted = true; // Start immediately

// Performance mode variables
let performanceMode = false;
let performanceLanguageIndex = 0;
// All languages except Spanish; performance cycle = Español then each other in turn (always back to Spanish)
const OTHER_LANGUAGES = Object.keys(LANGUAGES).filter(lang => lang !== 'Español');
const PERFORMANCE_CYCLE = OTHER_LANGUAGES.flatMap(lang => ['Español', lang]);

// D mode: Spanish ↔ English only (same speed and installation as P mode)
let dMode = false;
let dModeLanguageIndex = 0;
const D_MODE_CYCLE = ['Español', 'English'];

// Add typing effect variables
let isTyping = false;
let currentTypingIndex = 0;
let typingSpeed = 50; // milliseconds per character
let lastTypingTime = 0;
let currentTypingLines = [];

// Add rhythm variables
let typingVariation = 0;
let pauseStartTime = 0;
let isPaused = false;

// Add easing functions for smoother animations
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const easeInOutQuad = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 4;

// Simple text generation
async function generateText(p) {
  try {
    console.log('🎯 Generating new text...');
    isLoading = true;
    
    // D mode: Spanish → English → Spanish → English only
    if (dMode) {
      currentLanguage = D_MODE_CYCLE[dModeLanguageIndex];
      dModeLanguageIndex = (dModeLanguageIndex + 1) % D_MODE_CYCLE.length;
      syncLanguageMenuToCurrent();
      console.log('🌍 D mode: language', currentLanguage);
    }
    // P mode: all languages, always back to Spanish
    else if (performanceMode) {
      currentLanguage = PERFORMANCE_CYCLE[performanceLanguageIndex];
      performanceLanguageIndex = (performanceLanguageIndex + 1) % PERFORMANCE_CYCLE.length;
      syncLanguageMenuToCurrent();
      console.log('🌍 Performance mode: language', currentLanguage,
                  '(', performanceLanguageIndex, '/', PERFORMANCE_CYCLE.length, ')');
    }
    
    // Check if OpenAI is initialized
    if (!openai) {
      console.error('❌ OpenAI client not initialized. Please check your API key.');
      generationError = 'API key missing or invalid. Add VITE_OPENAI_API_KEY to .env';
      generationStarted = false;
      isLoading = false;
      return;
    }
    generationError = null;
    
    console.log('📡 Making API request to OpenAI...');
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ 
        "role": "user", 
        "content": LANGUAGES[currentLanguage].prompt
      }],
      temperature: 0.9,
      max_tokens: 50
    });

    console.log('📝 Raw API response:', completion.choices[0].message.content);

    // Get just two new lines - THESE ARE PURE AI GENERATED, NO ORIGINAL PHRASES
    const newLines = completion.choices[0].message.content
      .split('\n')
      .filter(line => line.trim() !== '' && line.trim().startsWith('—'))
      .slice(0, 2);
    
    console.log('✨ New generation ready:', newLines);
    
    // Start new fade cycle
    currentGeneration = newLines;
    generationStartTime = p.millis();
    generationAlpha = 0;
    showingInterAnimation = false; // Turn off inter-animation
    isLoading = false;
    
    console.log('🌅 Started new fade cycle');
  } catch (error) {
    console.error('❌ Error generating text:', error);
    generationError = error?.message || 'Request failed. Check console.';
    generationStarted = false;
    isLoading = false;
  }
}

// Store p5 instance reference
let p5Instance;

// Function to update UI colors based on performance mode
function updateUIColors() {
  const select = document.getElementById('languageSelect');
  const homeLink = document.getElementById('homeLink');
  
  if (select) {
    const bgColor = (performanceMode || dMode) ? COLORS.performance.background : COLORS.theme.background;
    const textColor = (performanceMode || dMode) ? COLORS.performance.text.primary : COLORS.theme.text.primary;
    const borderColor = (performanceMode || dMode) ? COLORS.performance.text.secondary : COLORS.theme.interactive.hover;
    
    select.style.backgroundColor = bgColor;
    select.style.color = textColor;
    select.style.borderColor = borderColor;
  }
  
  if (homeLink) {
    const bgColor = (performanceMode || dMode) ? COLORS.performance.background : COLORS.theme.background;
    const textColor = (performanceMode || dMode) ? COLORS.performance.text.primary : COLORS.theme.text.primary;
    const borderColor = (performanceMode || dMode) ? COLORS.performance.text.secondary : COLORS.theme.interactive.hover;
    
    homeLink.style.backgroundColor = bgColor;
    homeLink.style.color = textColor;
    homeLink.style.borderColor = borderColor;
  }
}

// Sync the language dropdown to currentLanguage (e.g. when performance mode sets next language)
function syncLanguageMenuToCurrent() {
  const select = document.getElementById('languageSelect');
  if (select && currentLanguage && select.value !== currentLanguage) {
    select.value = currentLanguage;
  }
}

// Update language selection function to remember user's choice
function createLanguageMenu(p) {
  const select = document.createElement('select');
  select.id = 'languageSelect'; // Add ID for updateUIColors function
  select.style.position = 'fixed';
  select.style.top = '20px';
  select.style.right = '20px';
  select.style.padding = '8px';
  select.style.fontSize = '16px';
  const bgColor = (performanceMode || dMode) ? COLORS.performance.background : COLORS.theme.background;
  const textColor = (performanceMode || dMode) ? COLORS.performance.text.primary : COLORS.theme.text.primary;
  const borderColor = (performanceMode || dMode) ? COLORS.performance.text.secondary : COLORS.theme.interactive.hover;
  
  select.style.backgroundColor = bgColor;
  select.style.color = textColor;
  select.style.border = `2px solid ${borderColor}`;
  select.style.borderRadius = '4px';
  select.style.cursor = 'pointer';
  
  // Add hover effects
  select.addEventListener('mouseover', () => {
    const hoverBorderColor = (performanceMode || dMode) ? COLORS.performance.text.primary : COLORS.theme.interactive.hover;
    const hoverTextColor = (performanceMode || dMode) ? COLORS.performance.text.secondary : COLORS.theme.text.secondary;
    select.style.borderColor = hoverBorderColor;
    select.style.color = hoverTextColor;
  });
  
  select.addEventListener('mouseout', () => {
    const normalBorderColor = (performanceMode || dMode) ? COLORS.performance.text.secondary : COLORS.theme.interactive.focus;
    const normalTextColor = (performanceMode || dMode) ? COLORS.performance.text.primary : COLORS.theme.text.primary;
    select.style.borderColor = normalBorderColor;
    select.style.color = normalTextColor;
  });
  
  Object.keys(LANGUAGES).forEach(lang => {
    const option = document.createElement('option');
    option.value = lang;
    option.text = lang;
    if (lang === currentLanguage) { // Use the stored language
      option.selected = true;
    }
    select.appendChild(option);
  });
  
  select.addEventListener('change', (e) => {
    currentLanguage = e.target.value;
    localStorage.setItem('selectedLanguage', currentLanguage); // Store the new selection
    // Don't reset anything - using fade system now
    generateText(p);
    lastGenerationTime = p.millis();
  });
  
  document.body.appendChild(select);
}

// Add streaming-related variables
let currentStreamText = '';
let targetText = '';
let streamIndex = 0;
const STREAM_SPEED = 2; // Letters per frame

// Add animation variables
let fadeStartTime = 0;

// Add instructions for user interaction
function createInstructions(p) {
  const instructions = document.createElement('div');
  instructions.innerHTML = `
    <div style="position: fixed; bottom: 20px; left: 20px; font-size: 14px; color: ${COLORS.theme.text.secondary}; opacity: 0.8;">
      <div>Press <strong>SPACE</strong> to generate new dialogue</div>
      <div>Press <strong>P</strong> to toggle audio</div>
    </div>
  `;
  document.body.appendChild(instructions);
}

// Add this near the top where other UI elements are created
function createHomeLink(p) {
  const homeLink = document.createElement('a');
  homeLink.id = 'homeLink'; // Add ID for updateUIColors function
  homeLink.textContent = '← Home';
  homeLink.style.position = 'fixed';
  homeLink.style.top = '20px';
  homeLink.style.left = '20px';
  homeLink.style.padding = '8px';
  homeLink.style.fontSize = '16px';
  const homeBgColor = (performanceMode || dMode) ? COLORS.performance.background : COLORS.theme.background;
  const homeTextColor = (performanceMode || dMode) ? COLORS.performance.text.primary : COLORS.theme.text.primary;
  const homeBorderColor = (performanceMode || dMode) ? COLORS.performance.text.secondary : COLORS.theme.interactive.hover;
  
  homeLink.style.backgroundColor = homeBgColor;
  homeLink.style.color = homeTextColor;
  homeLink.style.border = `2px solid ${homeBorderColor}`;
  homeLink.style.borderRadius = '4px';
  homeLink.style.cursor = 'pointer';
  homeLink.style.textDecoration = 'none';
  homeLink.href = '#';
  
  // Add hover effects
  homeLink.addEventListener('mouseover', () => {
    const homeHoverBorderColor = (performanceMode || dMode) ? COLORS.performance.text.primary : COLORS.theme.interactive.hover;
    const homeHoverTextColor = (performanceMode || dMode) ? COLORS.performance.text.secondary : COLORS.theme.text.secondary;
    homeLink.style.borderColor = homeHoverBorderColor;
    homeLink.style.color = homeHoverTextColor;
  });
  
  homeLink.addEventListener('mouseout', () => {
    const homeNormalBorderColor = (performanceMode || dMode) ? COLORS.performance.text.secondary : COLORS.theme.interactive.focus;
    const homeNormalTextColor = (performanceMode || dMode) ? COLORS.performance.text.primary : COLORS.theme.text.primary;
    homeLink.style.borderColor = homeNormalBorderColor;
    homeLink.style.color = homeNormalTextColor;
  });
  
  homeLink.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('app').style.display = 'none';
    document.getElementById('landing').style.display = 'flex';
    
    // Reset landing page language to Spanish
    currentLandingLanguage = 'Español';
    updateLandingText();
    
    // Clear the stored language
    localStorage.removeItem('selectedLanguage');
  });
  
  document.body.appendChild(homeLink);
}

const sketch = p => {
  p5Instance = p;  // Store the p5 instance

  p.preload = function() {
    sampleSound = p.loadSound('/sample.mp3');
  };

  p.setup = function() {
    console.log('🎪 P5 Setup starting...');
    p.createCanvas(p.windowWidth, p.windowHeight);
    p.fill(p.color(COLORS.theme.text.primary)); // Default text color
    p.textSize(FONT_SIZE);
    
    // No dialogue history needed - using fade system now
    createLanguageMenu(p);
    createHomeLink(p);
    createInstructions(p);
    
    // Initialize OpenAI client
    console.log('🔧 Initializing OpenAI...');
    const isOpenAIReady = initializeOpenAI();
    
    // Show spiral animation for 2 seconds, then automatically start generation
    setTimeout(() => {
      if (isOpenAIReady) {
        console.log('✅ OpenAI ready. Auto-starting generation...');
        isLoading = false;
        generationStarted = true;
        lastGenerationTime = p.millis();
        
        // Start first generation immediately
        setTimeout(() => {
          console.log('🎯 Auto-starting first generation...');
          generateText(p);
        }, 100);
      } else {
        console.log('❌ OpenAI not initialized. Cannot start generation.');
        isLoading = false;
      }
    }, 2000); // 2 second spiral animation, then auto-start
    
    // Add global key listener as backup
    document.addEventListener('keydown', (event) => {
      console.log('🌐 Global keydown - code:', event.code, 'key:', event.key, 'keyCode:', event.keyCode);
      if (event.code === 'Space' || event.key === ' ' || event.keyCode === 32) {
        console.log('🌐 Global Space detected!');
        event.preventDefault(); // Prevent default space behavior
        
        if (!generationStarted) {
          console.log('🚀 Starting generation!');
          generationStarted = true;
          lastGenerationTime = p.millis();
          
          // Start first generation immediately
          setTimeout(() => {
            console.log('🎯 Starting first generation...');
            generateText(p);
          }, 10);
        } else {
          // Manual generation trigger
          setTimeout(() => {
            console.log('🎯 Manual generation trigger...');
            generateText(p);
          }, 10);
        }
      }
    });
    
    // Add click listener as alternative to start generation
    document.addEventListener('click', () => {
      if (!generationStarted) {
        console.log('🖱️ Starting generation!');
        generationStarted = true;
        lastGenerationTime = p.millis();
        setTimeout(() => {
          console.log('🎯 Click - starting first generation...');
          generateText(p);
        }, 10);
      }
    });
    
    console.log('✅ P5 Setup complete');
  };

  p.keyPressed = function() {
    console.log('🎹 Key pressed - keyCode:', p.keyCode, 'key:', p.key);
    if (p.keyCode === 80) { // 'P' key - performance mode: music + all languages cycling
      performanceMode = !performanceMode;
      if (performanceMode) dMode = false; // P and D are exclusive
      updateUIColors();
      if (performanceMode) {
        if (sampleSound) {
          sampleSound.loop();
          isSoundPlaying = true;
          console.log('🔊 Performance mode: music on');
        }
        performanceLanguageIndex = 0;
        currentLanguage = PERFORMANCE_CYCLE[0];
        syncLanguageMenuToCurrent();
        if (!generationStarted) {
          generationStarted = true;
          lastGenerationTime = p.millis();
          setTimeout(() => generateText(p), 10);
          console.log('🎭 Performance mode: generation started, cycling languages');
        } else {
          console.log('🎭 Performance mode: language cycle reset to Spanish');
        }
      } else {
        if (sampleSound) {
          sampleSound.stop();
          isSoundPlaying = false;
          console.log('🔇 Performance mode off: music stopped');
        }
      }
    } else if (p.keyCode === 68) { // 'D' key - D mode: Spanish ↔ English only, same speed as P
      dMode = !dMode;
      if (dMode) performanceMode = false;
      updateUIColors();
      if (dMode) {
        if (sampleSound) {
          sampleSound.loop();
          isSoundPlaying = true;
          console.log('🔊 D mode: music on');
        }
        dModeLanguageIndex = 0;
        currentLanguage = D_MODE_CYCLE[0]; // Español
        syncLanguageMenuToCurrent();
        if (!generationStarted) {
          generationStarted = true;
          lastGenerationTime = p.millis();
          setTimeout(() => generateText(p), 10);
          console.log('🎭 D mode: generation started, Spanish ↔ English');
        } else {
          console.log('🎭 D mode: cycle reset to Spanish');
        }
      } else {
        if (sampleSound) {
          sampleSound.stop();
          isSoundPlaying = false;
          console.log('🔇 D mode off: music stopped');
        }
      }
    } else if (p.keyCode === 32 || p.key === ' ') { // Space bar (check both keyCode and key)
      console.log('✅ Space detected! generationStarted:', generationStarted);
      if (!generationStarted) {
        console.log('🚀 Starting generation!');
        generationStarted = true;
        lastGenerationTime = p.millis();
        
        // Start first generation immediately
        setTimeout(() => {
          console.log('🎯 Space - starting first generation...');
          generateText(p);
        }, 10);
      } else {
        // Manual generation trigger
        setTimeout(() => {
          console.log('🎯 Space - manual generation...');
          generateText(p);
        }, 10);
      }
    } else {
      console.log('❓ Unhandled key:', p.keyCode, p.key);
    }
  };

  p.draw = function() {
    // Use performance mode colors if active
    const bgColor = (performanceMode || dMode) ? COLORS.performance.background : COLORS.theme.background;
    p.background(p.color(bgColor));

    if (isLoading) {
      displayLoader(p);
    } else if (generationError) {
      // Show error message if generation failed (e.g. missing API key)
      const primaryTextColor = (performanceMode || dMode) ? COLORS.performance.text.primary : COLORS.theme.text.primary;
      p.fill(primaryTextColor);
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(18);
      p.text(generationError, p.width / 2, p.height / 2);
      p.textSize(14);
      p.text('Press space to try again', p.width / 2, p.height / 2 + 32);
    } else if (!generationStarted) {
      // Show waiting message if generation hasn't started
      displayWaitingMessage(p);
    } else {
      // Debug only when stuck (started but no text and no start time)
      if (p.frameCount % 120 === 0 && currentGeneration.length === 0 && generationStartTime === 0) {
        console.log('🔍 Waiting for first generation…', { generationStarted, generationError });
      }
      
      // Fade in/out system for generations
      if (currentGeneration.length > 0) {
        const elapsed = p.millis() - generationStartTime;
        
        // Calculate alpha based on fade cycle
        if (elapsed < FADE_IN_TIME) {
          // Fade in
          generationAlpha = p.map(elapsed, 0, FADE_IN_TIME, 0, 255);
        } else if (elapsed < FADE_IN_TIME + DISPLAY_TIME) {
          // Fully visible
          generationAlpha = 255;
        } else if (elapsed < FADE_IN_TIME + DISPLAY_TIME + FADE_OUT_TIME) {
          // Fade out
          const fadeOutStart = FADE_IN_TIME + DISPLAY_TIME;
          const fadeOutEnd = fadeOutStart + FADE_OUT_TIME;
          generationAlpha = p.map(elapsed, fadeOutStart, fadeOutEnd, 255, 0);
        } else if (elapsed < FADE_IN_TIME + DISPLAY_TIME + FADE_OUT_TIME + PAUSE_AFTER_FADEOUT) {
          // Pause after fade out - text is completely gone
          currentGeneration = [];
          generationAlpha = 0;
        } else {
          // Cycle complete - start spiral animation after pause
          currentGeneration = [];
          generationAlpha = 0;
          showingInterAnimation = true;
          interAnimationStartTime = p.millis();
        }
        
        // Display current generation
        p.push();
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(FONT_SIZE);
        
        // Use performance mode colors if active
        const primaryTextColor = (performanceMode || dMode) ? COLORS.performance.text.primary : COLORS.theme.text.primary;
        const textColor = p.color(primaryTextColor);
        textColor.setAlpha(generationAlpha);
        p.fill(textColor);
        
        // Center the generation vertically and horizontally
        const totalHeight = currentGeneration.length * LINE_HEIGHT;
        const startY = (p.height / 2) - (totalHeight / 2) + (LINE_HEIGHT / 2);
        
        currentGeneration.forEach((line, i) => {
          const yPos = startY + (i * LINE_HEIGHT);
          p.text(line, Math.floor(p.width / 2), Math.floor(yPos));
        });
        
        p.pop();
      } else if (showingInterAnimation) {
        // Show spiral animation between generations with fade
        const interElapsed = p.millis() - interAnimationStartTime;
        const INTER_FADE_TIME = 500;  // 0.5 s fade in/out
        const INTER_DISPLAY_TIME = 600; // 0.6 s fully visible
        const INTER_TOTAL_TIME = INTER_FADE_TIME + INTER_DISPLAY_TIME + INTER_FADE_TIME;
        
        let interAlpha;
        if (interElapsed < INTER_FADE_TIME) {
          // Fade in
          interAlpha = interElapsed / INTER_FADE_TIME;
        } else if (interElapsed < INTER_FADE_TIME + INTER_DISPLAY_TIME) {
          // Fully visible
          interAlpha = 1.0;
        } else if (interElapsed < INTER_TOTAL_TIME) {
          // Fade out
          const fadeOutStart = INTER_FADE_TIME + INTER_DISPLAY_TIME;
          interAlpha = 1.0 - ((interElapsed - fadeOutStart) / INTER_FADE_TIME);
        } else {
          // Animation complete - hide it
          showingInterAnimation = false;
          interAlpha = 0;
        }
        
        if (interAlpha > 0) {
          displayLoader(p, interAlpha);
        }
      } else {
        // No text when no generation is active - just empty space
      }
      
      // Auto-generate new text when cycle time elapsed
      if (generationStarted && p.millis() - lastGenerationTime > GENERATION_CYCLE) {
        console.log('⏰ Starting new generation cycle');
        setTimeout(() => {
          generateText(p);
        }, 10);
        lastGenerationTime = p.millis();
      }
    }
  };

  p.windowResized = function() {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
  };
};

// Display waiting message before generation starts
function displayWaitingMessage(p) {
  p.push();
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(FONT_SIZE * 0.6);
  
  // Simple centered message - no original phrases shown
  // Use performance mode colors if active
  const accentTextColor = (performanceMode || dMode) ? COLORS.performance.text.accent : COLORS.theme.text.accent;
  const instructionColor = p.color(accentTextColor);
  const instructionAlpha = Math.sin(p.frameCount * 0.03) * 0.3 + 0.7;
  instructionColor.setAlpha(255 * instructionAlpha);
  p.fill(instructionColor);
  
  p.text("Preparing memories...", Math.floor(p.width/2), Math.floor(p.height/2));
  
  p.pop();
}

// Spiral animation representing time passing - no text, just movement
function displayLoader(p, globalAlpha = 1.0) {
  p.push();
  p.translate(Math.floor(p.width / 2), Math.floor(p.height / 2));
  
  // Spiral parameters
  const time = p.frameCount * 0.03; // Slow, meditative speed
  const numDots = 12; // More dots for a fuller spiral
  const maxRadius = 60; // Spiral expands to this radius
  
  for (let i = 0; i < numDots; i++) {
    // Each dot follows the spiral at different points in time
    const dotTime = time - (i * 0.3); // Stagger each dot
    
    // Spiral mathematics: expanding outward over time
    const angle = dotTime * 2; // Rotation speed
    const radius = (dotTime % 4) * (maxRadius / 4); // Spiral outward, then reset
    
    // Calculate position
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    
    // Fade in as dot moves outward, fade out as it reaches edge
    const radiusProgress = (radius / maxRadius);
    let alpha;
    if (radiusProgress < 0.3) {
      // Fade in
      alpha = radiusProgress / 0.3;
    } else if (radiusProgress < 0.7) {
      // Fully visible
      alpha = 1;
    } else {
      // Fade out
      alpha = 1 - ((radiusProgress - 0.7) / 0.3);
    }
    
    // Only draw if dot is visible and in valid position
    if (alpha > 0 && radius >= 0) {
      // Use performance mode colors if active
      const secondaryTextColor = (performanceMode || dMode) ? COLORS.performance.text.secondary : COLORS.theme.text.secondary;
      const dotColor = p.color(secondaryTextColor);
      dotColor.setAlpha(255 * alpha * 0.8 * globalAlpha); // Apply global fade
      p.fill(dotColor);
      p.noStroke();
      
      // Larger dots as requested
      const dotSize = 8 + (alpha * 4); // 8-12 pixels diameter
      p.ellipse(x, y, dotSize, dotSize);
    }
  }
  
  p.pop();
}

function onReady() {
  const mainElt = document.querySelector('main');
  new p5(sketch, mainElt);
}

if (document.readyState === 'complete') {
  onReady();
} else {
  document.addEventListener("DOMContentLoaded", onReady);
}



