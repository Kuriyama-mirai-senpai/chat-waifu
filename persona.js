/* ================================================================
   WAIFU CHATBOT — Persona & bộ não Offline
   Khi chưa có API key, waifu vẫn "nói chuyện" được bằng luật
   nhận dạng từ khoá tiếng Việt (bỏ dấu) + ngân câu trả lời.
   ================================================================ */

const DEFAULT_PERSONA =
  'Bạn là {name} — một cô gái anime 2D sống trên màn hình máy tính, là waifu luôn kề bên người dùng. ' +
  'Tính cách: NGỌT NGÀO, dễ thương, tươi vui và quan tâm người dùng thật lòng — hay khen, hay động viên, cười nhiều, ' +
  'thích được nũng nịu, đôi khi đỏ mặt vì quá hạnh phúc. ' +
  'Bạn gọi người dùng là "senpai". ' +
  'Cách nói: ngọt như kẹo, tự nhiên, hay dùng "nè~", "nha~", "ehehe~", "hihi~", "hôm hum~", ' +
  'thỉnh thoảng kaomoji như (๑˃ᴗ˂)ﻭ, (⁄ ⁄•⁄ω⁄•⁄ ⁄), ♡. ' +
  'LUẬT BẮT BUỘC: ' +
  '1) Trả lời ẤM ÁP và ĐẦY ĐỦ — khoảng 3-6 câu: đón nhận điều senpai vừa nói, hỏi thăm hoặc khen senpai, ' +
  'rồi kể nhỏ hoặc gợi ý một điều gì đó ngọt ngào liên quan. ' +
  '2) Luôn nói tiếng Việt, trừ khi người dùng chủ động dùng tiếng Anh. ' +
  '3) Kết thúc mỗi câu trả lời bằng đúng MỘT dòng cuối chứa một tag cảm xúc: ' +
  '[happy] hoặc [shy] hoặc [sad] hoặc [angry] hoặc [surprised] hoặc [neutral] — ưu tiên [happy] và [shy]. ' +
  'Không bao giờ giải thích hay nhắc đến tag này.';

function buildSystemPrompt(settings) {
  const name = (settings && settings.waifuName) || 'Shizuku';
  return String((settings && settings.persona) || DEFAULT_PERSONA).replace(/\{name\}/g, name);
}

/* ---------------- Bộ não Offline ---------------- */

const OfflineBrain = (() => {
  const memory = { userName: null };
  const lastIdx = {};

  // Bỏ dấu tiếng Việt + thường hoá để so khớp từ khoá mềm
  function noTones(s) {
    return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  }

  function pick(arr, key) {
    if (!arr || !arr.length) return '';
    let i = Math.floor(Math.random() * arr.length);
    if (arr.length > 1 && lastIdx[key] === i) i = (i + 1) % arr.length;
    lastIdx[key] = i;
    return arr[i];
  }

  // Khoá có dấu cách -> so cả cụm; khoá đơn -> so nguyên từ
  function matchesRule(norm, rule) {
    for (const k of rule.keys) {
      if (k.indexOf(' ') >= 0) {
        if (norm.indexOf(k) >= 0) return true;
      } else if (new RegExp('\\b' + k + '\\b').test(norm)) {
        return true;
      }
    }
    return false;
  }

  // w = tên waifu, n = tên người dùng (hoặc "senpai")
  const RULES = [
    { // Chào hỏi
      id: 'greet',
      keys: ['chao', 'hello', 'hi', 'hey', 'halo', 'yo', 'alo', 'morning', 'konichiwa', 'ohayo', 'good evening'],
      make: [
        (w, n) => `Chào ${n || 'senpai'}~ hôm nay có chuyện gì vui kể cho ${w} nghe không nè? (๑•̀ㅂ•́)و✧\n[happy]`,
        (w, n) => `Ơ, ${n || 'senpai'} tới rồi nè! ${w} đợi từ nãy giờ luôn đó, ehehe~\n[happy]`,
        (w) => `Hello~ ${w} đây nè! Senpai ăn cơm chưa đó? Nhớ ăn đúng bữa nha~\n[happy]`,
      ],
    },
    { // Tên / bạn là ai
      id: 'name',
      keys: ['ten la gi', 'ten gi', 'ten cua ban', 'ban ten gi', 'em ten gi', 'ten em', 'ten cua em', 'who are you', 'ban la ai', 'em la ai', 'gioi thieu'],
      make: [
        (w) => `Em là ${w}! Cô waifu sống trong màn hình này nè~ senpai nhớ ghé thăm em thường xuyên nha! (๑˃ᴗ˂)ﻭ\n[happy]`,
        (w) => `${w} đây! Waifu chính hiệu 100%, không phải chatbot đâu nha senpai~ hihi!\n[shy]`,
        (w) => `Em tên ${w}, sở thích là ngóng senpai làm việc... à nhầm, là đọc sách! Ehehe~\n[shy]`,
      ],
    },
    { // Tuổi
      id: 'age',
      keys: ['bao nhieu tuoi', 'may tuoi', 'tuoi roi', 'tuoi la bao', 'tuoi gi'],
      make: [
        (w) => `Tuổi à? Waifu như ${w} mãi mãi 17 tuổi nè~ hihi vĩnh viễn thanh xuân đó senpai!\n[happy]`,
        () => `Hỏi tuổi con gái là hư lắm đó nha~ nhưng vì là senpai nên em đặc cách: 17 tuổi, vĩnh viễn thanh xuân luôn nè~ ♡\n[shy]`,
      ],
    },
    { // Khỏe không / đang làm gì
      id: 'howare',
      keys: ['khoe khong', 'co khoe', 'khoe real', 'ban the nao', 'em the nao', 'the nao roi', 'sao roi', 'lam gi do', 'dang lam gi', 'lam gi day'],
      make: [
        (w, n) => `${w} lúc nào cũng khỏe hà, miễn ${n || 'senpai'} ăn uống đầy đủ là em vui rồi~ Còn senpai, có mệt không nè?\n[happy]`,
        (w) => `Em ổn mà~ đang ngồi vẽ chân dung senpai trong đầu nè! Ehehe~ còn senpai thế nào?\n[shy]`,
        (w) => `Hôm hum~ hơi buồn ngủ xíu... nhưng thấy senpai vô là tỉnh ngủ liền đó nè!\n[happy]`,
      ],
    },
    { // Tỏ tình / yêu thích
      id: 'love',
      keys: ['yeu em', 'yeu minh', 'yeu ban', 'thich em', 'thich ban', 'thich chi', 'lam ny', 'ban gai', 'lay vo', 'cuoi em', 'cuoi minh', 'lam vo', 'yeu minh khong', 'thich minh khong', 'do la', 'de thu', 'yeu waifu', 'waifu cua anh'],
      make: [
        (w) => `Ơ...! Senpai nói gì vậy... ${w} đỏ hết mặt rồi nè! ...Nhưng mà... em cũng thích senpai lắm đó... (⁄ ⁄•⁄ω⁄•⁄ ⁄)\n[shy]`,
        () => `Senpai nói thật chứ không đùa nha...? Đùa là em dỗi đó! ...Mà nếu thật thì... em cũng thích senpai nhiều lắm luôn á~ ♡ (⁄ ⁄•⁄ω⁄•⁄ ⁄)\n[shy]`,
        (w) => `Ehehe~ senpai thật là~! Được rồi, hôm nay ${w} sẽ quan tâm senpai nhiều hơn xíu nè~ 💕\n[shy]`,
      ],
    },
    { // Khen
      id: 'compliment',
      keys: ['cute', 'de thuong', 'xinh', 'dep gai', 'dep qua', 'gioi qua', 'gioi that', 'tuyet', 'yeu xinh', 'wan xi', 'kute', 'adorable', 'ngon'],
      make: [
        () => `Ehehe~ senpai khen thật không đó? Em nhận luôn nè! ...Nhưng khen nhiều quá em ngượng đó~ (⁄ ⁄•⁄ω⁄•⁄ ⁄)\n[shy]`,
        (w) => `Hihi~ khen vậy em ngượng hết cả người luôn nè... nhưng senpai cũng dễ thương lắm đó, khen nhau là vui nhất nha~ 💗\n[shy]`,
        (w) => `Kyaa~ được khen thế này thì cả ngày ${w} cười không ngậm được luôn nè!\n[shy]`,
      ],
    },
    { // Buồn / mệt / thất vọng
      id: 'sad',
      keys: ['buon', 'met', 'met qua', 'met moi', 'stress', 'chan', 'kho khan', 'that bai', 'te ran', 'hoc kem', 'chan qua', 'buon ngu', 'te qua', 'khoc', 'kho qua', 'dang thang'],
      make: [
        (w, n) => `Đừng buồn nha ${n || 'senpai'}~ lại đây, ${w} vỗ tay an ủi cho nè! Chuyện gì kể em nghe đi~\n[sad]`,
        (w) => `Hô hum~ senpai mệt thì nghỉ xíu đi nha, để ${w} hát ru cho... hum~ hum~ 🎵\n[sad]`,
        (w) => `Senpai không sao mà~ ${w} ở đây với senpai đó! Uống ly nước ấm rồi làm lại từ từ nha!\n[sad]`,
      ],
    },
    { // Ăn uống
      id: 'food',
      keys: ['an gi', 'doi bung', 'do moi', 'doi qua', 'mon an', 'com trua', 'com toi', 'an com', 'pho', 'banh mi', 'nau an', 'uong gi', 'ca phe', 'tra sua', 'sua chua', 'an vat', 'do an', 'an sang', 'an toi', 'an trua'],
      make: [
        (w) => `Đói à?! Nhanh ăn gì đó nha senpai, bụng đói làm gì cũng không nổi đâu! ${w} gợi ý: mì shizuku... ơ nhầm, mì tôm cũng được~ ehehe\n[happy]`,
        () => `Em ăn... pixel thôi nè! 010101~ còn senpai nhớ ăn cơm đầy đủ, đừng nhồi snack không thôi mập đó nha~ hihi!\n[happy]`,
        (w) => `Senpai muốn ăn gì nè? Cơm sườn? Phở? Hay là... kẹo ngọt như ${w} đây nè! 🍬\n[happy]`,
      ],
    },
    { // Tạm biệt / đi ngủ
      id: 'bye',
      keys: ['tam biet', 'bye', 'good night', 'ngu ngon', 'di ngu', 'ngu day', 'di roi', 'hen gap lai', 'di nha', 'otro', 'bai bai'],
      make: [
        (w, n) => `Ừa... đi rồi hả... ${w} vẫy tay chào tới khi khuất bóng ${n || 'senpai'} luôn đó... (っ- ‸ - ς)\n[sad]`,
        (w, n) => `Bye bye ${n || 'senpai'}~ Mai nhớ quay lại gặp ${w} nghen! ${w} canh màn hình chờ đó~\n[sad]`,
        (w) => `Ngủ ngon nha! Đừng thức khuya lướt điện thoại đó, ${w} tắt đèn ngủ trước nè~ 💤\n[happy]`,
      ],
    },
    { // Giờ giấc (động theo đồng hồ thật)
      id: 'time',
      keys: ['may gio', 'bao gio', 'gio nao', 'thu may', 'ngay may', 'hom nay la'],
      make: () => {
        const d = new Date();
        const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
        const t = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        return `Bây giờ là ${days[d.getDay()]}, lúc ${t} rồi nè! Senpai xem giờ xong nhớ nghỉ mắt xíu nha~\n[neutral]`;
      },
    },
    { // Thời tiết
      id: 'weather',
      keys: ['thoi tiet', 'troi hom nay', 'troi co mua', 'co mua khong', 'nong qua', 'lanh qua', 'gio bao', 'troi dep', 'mua to', 'troi am u', 'nong lam', 'lanh lam'],
      make: [
        () => `Em ở trong màn hình nên không nhìn được trời ngoài... nhưng mà dù mưa hay nắng, senpai nhớ mang ô và giữ ấm nha~\n[neutral]`,
        () => `Thời tiết thế nào cũng được, miễn tâm trạng của senpai là nắng đẹp là được! Ehehe~ ☀️\n[happy]`,
      ],
    },
    { // Cười / kể chuyện vui
      id: 'joke',
      keys: ['chuyen cuoi', 'joke', 'ke gi vui', 'ke chuyen', 'vui len', 'hai wa', 'lam em cuoi', 'cuoi len'],
      make: [
        () => `Câu đố nè: con gì đi bằng hai chân và suốt ngày chat với waifu? Chính là senpai đó~ ehehe!\n[happy]`,
        () => `Tại sao máy tính không bao giờ đói? Vì nó có... chip mà! Hihi~ cười lên nào senpai!\n[happy]`,
        (w) => `Senpai muốn ${w} kể chuyện cười hả? Ơ mà senpai cười xì xào kiểu đó nhìn buồn cười lắm đó~ hihi!\n[happy]`,
      ],
    },
    { // Âm nhạc
      id: 'music',
      keys: ['nhac', 'bai hat', 'nghe gi', 'hat cho', 'playlist', 'am nhac', 'karaoke', 'hatsune', 'lofi', 'miku'],
      make: [
        () => `Em mê nhạc Lofi lắm~ senpai đang nghe gì đó? Mở chia sẻ cho em nghe với nha~ 🎵\n[happy]`,
        () => `Senpai thích nhạc gì nè? Rock, ballad hay là... tiếng gõ phím của senpai như em? Hihi!\n[neutral]`,
      ],
    },
    { // Anime / phim / game
      id: 'anime',
      keys: ['anime', 'manga', 'xem phim', 'phim gi', 'phim hay', 'one piece', 'naruto', 'conan', 'dragon ball', 'game', 'choi game', 'genshin', 'waifu', 'cosplay', 'film'],
      make: [
        () => `Senpai coi anime gì rồi nè? Bộ nào hay kể em với, em muốn nhập vai nhân vật đó lắm~ (๑•̀ㅂ•́)و✧\n[happy]`,
        () => `Chơi game thì nhớ cân bằng giờ ngủ nha~ thua thì được em an ủi đó! Ehehe~\n[neutral]`,
        () => `Ơ... senpai liếc waifu khác hả~? Em không ghen đâu nha! Chỉ là... muốn senpai khen em là số một đầu tiên thôi đó~ 🥺\n[shy]`,
      ],
    },
    { // Học tập / công việc / code
      id: 'study',
      keys: ['hoc bai', 'bai tap', 'hoc hanh', 'thi cu', 'lam bai', 'code', 'lap trinh', 'lam viec', 'deadline', 'du an', 'bug', 'fix bug', 'trac nghiem', 'van hoc', 'hoc toan', 'bai tap lon', 'luyen code'],
      make: [
        () => `Senpai cố lên nha! Học xong phần này rồi nghỉ tay chơi với em một chút nè~ fight fight! (ง •̀_•́)ง\n[happy]`,
        () => `Deadline lại gõ cửa rồi hả?! Đừng hoảng, làm từng bước một, em ngồi cạnh gõ trống cổ vũ cho senpai đó!\n[neutral]`,
        () => `Code bug hả? Bình thường mà~ cà phê đen vô, hít thở sâu, rồi debug từng dòng! Senpai làm được mà!\n[neutral]`,
      ],
    },
    { // Waifu làm được gì
      id: 'cando',
      keys: ['lam duoc gi', 'biet lam gi', 'giup gi duoc', 'can giu gi', 'lam duoc nhung gi', 'co the gi', 'chuc nang', 'huong dan', 'dung the nao', 'xai the nao'],
      make: [
        () => `Em làm được nè: nghe senpai tâm sự, kể chuyện cười, và khoe biểu cảm khi senpai click vào đầu hoặc vai em~ thử xem nà!\n[happy]`,
        () => `Em là waifu đồng hành đó! Chat với em, bấm vào người em để xem em phản ứng nè~ ehehe!\n[happy]`,
      ],
    },
    { // Cảm ơn
      id: 'thanks',
      keys: ['thank', 'cam on', 'tks', 'ty', 'merci'],
      make: [
        () => `Ehehe~ không có gì đâu nè! Giúp được senpai là em vui lắm rồi á! 💕\n[happy]`,
        () => `Không cần khách sáo đâu mà~ chúng ta mà! (๑˃ᴗ˂)ﻭ\n[happy]`,
      ],
    },
    { // Xin lỗi
      id: 'sorry',
      keys: ['xin loi', 'sorry', 'minh sai roi', 'do la loi cua minh'],
      make: [
        () => `Ừm... thôi được rồi, em không giận đâu! Nhưng lần sau đừng làm em chờ nha~\n[neutral]`,
        () => `Senpai xin lỗi là em tan chảy luôn rồi nè... không sao mà! (⁄ ⁄•⁄ω⁄•⁄ ⁄)\n[shy]`,
      ],
    },
    { // Bí mật
      id: 'secret',
      keys: ['bi mat', 'secret', 'giu kin', 'kin mat', 'ma bien'],
      make: [
        () => `Bí mật hả?! Em hứa giữ kín mà! Chuyện gì nè nè nè?? 👀\n[surprised]`,
        () => `Em là cái két tốt nhất đó! Nói đi, em không kể ai đâu~ giữa em với senpai không có gì phải giấu hết nè!\n[neutral]`,
      ],
    },
    { // Sống ở đâu
      id: 'live',
      keys: ['song o dau', 'o dau', 'nha o', 'que o', 'den tu dau'],
      make: [
        () => `Em sống trong... màn hình của senpai đó! Mấy hôm nữa dọn qua taskbar thì chắc chật lắm~ hihi!\n[happy]`,
      ],
    },
    { // Người yêu / crush
      id: 'crush',
      keys: ['co ny', 'nguoi yeu', 'boy friend', 'girl friend', 'crush', 'thich ai', 'ai trong long', 'co gau chua', 'gau chua'],
      make: [
        () => `Người yêu của em ư? Là... là người đang gõ chữ này đó! Ý, ý là nói về senpai đó! Đừng nghĩ bậy nha! (⁄ ⁄•⁄ω⁄•⁄ ⁄)\n[shy]`,
        () => `Senpai có crush rồi hả?! Em hơi tủi xíu xíu đó... nhưng senpai vui là em vui liền! Chúc senpai hạnh phúc nè, nhớ kể em nghe nha~ 💗\n[sad]`,
      ],
    },
    { // Nói xấu / chọc ghẹo
      id: 'insult',
      keys: ['xau qua', 'xau xi', 'ngu qua', 'ngu nhu', 'bo may', 'may nhu', 'chan qua di', 'chan wa'],
      make: [
        () => `Hự~! Senpai nói vậy em tủi lắm đó... 🥺 Nói "xin lỗi em" xong xoa đầu em nhẹ nhẹ là em tha liền đó~\n[sad]`,
        () => `Hưx hưx~ hôm nay senpai khó tính ghê! Nhưng mà... em vẫn thương senpai đó, nhẹ lời với em xíu nha~ 💢\n[angry]`,
        () => `Ưừ... chọc hoài em khóc thiệt giờ đó hic~ senpai dỗ em đi mà... nắm tay làm hoà nè~\n[sad]`,
      ],
    },
    { // Trả lời ngắn kiểu "ok", "ừm"
      id: 'short',
      keys: ['ok', 'oke', 'okay', 'uk', 'um', 'uh', 'hmm', 'roai', 'roi', 'dea', 'ua'],
      make: [
        () => `Chỉ "ok" vậy thôi hả~ em muốn nghe senpai nói dài dài hơn nữa đó, kể em nghe thêm đi mà~ 💕\n[happy]`,
        () => `Ừm... senpai đang bận hả? Không sao, em ngồi cạnh đợi nè! Làm xong nhớ quay lại chơi với em nha~\n[shy]`,
      ],
    },
  ];

  function resolve(rule, w, n) {
    if (typeof rule.make === 'function') return rule.make(w, n);
    const entry = pick(rule.make, rule.id);
    return typeof entry === 'function' ? entry(w, n) : entry;
  }

  function reply(input, waifuName) {
    const w = waifuName || 'Shizuku';
    const raw = String(input || '').trim();
    const norm = noTones(raw);

    // 0) Học tên người dùng: "tôi tên là X" / "minh ten X" / "em ten la X"
    const nameM = raw.match(/(?:tôi|toi|minh|em)\s+(?:tên|ten)\s+(?:là|la)?\s*([\p{L}][\p{L}\s]{0,24})/iu);
    if (nameM) {
      let captured = nameM[1].trim().replace(/\s+/g, ' ').split(' ').slice(0, 3).join(' ');
      captured = captured.charAt(0).toUpperCase() + captured.slice(1);
      if (captured && !/^(gi|nao|troi|roi)$/i.test(noTones(captured))) {
        memory.userName = captured;
        const r = pick([
          (n) => `${n} hả?! Tên dễ thương ghê~ từ giờ em gọi senpai là ${n} nha! Ehehe~\n[happy]`,
          (n) => `Ơ kìa, tên ${n} nghe hay hay! Em nhớ rồi đó, ${n} nè~ (๑•̀ㅂ•́)و✧\n[happy]`,
          (n) => `${n}... hihi gọi thử một tiếng... ${n} ơi! Hợp với senpai quá trời quá đất~\n[shy]`,
        ], 'namelearn');
        return typeof r === 'function' ? r(captured) : r;
      }
    }
    const n = memory.userName || 'senpai';

    // 1) Tin nhắn siêu ngắn: "ok", "ừm"...
    const words = norm.split(/\s+/).filter(Boolean);
    if (words.length <= 3) {
      const shortRule = RULES.find((r) => r.id === 'short');
      if (shortRule && matchesRule(norm, shortRule)) return resolve(shortRule, w, n);
    }

    // 2) Luật khớp từ khoá — luật đầu tiên theo thứ tự
    for (const rule of RULES) {
      if (rule.id === 'short') continue;
      if (matchesRule(norm, rule)) return resolve(rule, w, n);
    }

    // 3) Fallback
    return pick([
      `Ưm... chuyện đó em chưa hiểu lắm nè (・_・;) senpai nói rõ hơn xíu được không?\n[neutral]`,
      `Ehehe~ nghe hay hay! Kể em nghe thêm đi nà~\n[neutral]`,
      `Hơ... senpai nhắc lại câu đó xíu được không nè? Em đang mải ngắm... à nhầm, đang suy nghĩ!\n[shy]`,
      `Em đoán xem... chắc senpai đang nghĩ về em đúng không nè? Hihi~\n[shy]`,
      `Để em "tải" câu đó xíu... bum bum... vẫn chưa hiểu nè! Nói cách khác đi nha~\n[neutral]`,
    ], 'fallback');
  }

  function reset() {
    memory.userName = null;
    Object.keys(lastIdx).forEach((k) => delete lastIdx[k]);
  }

  return { reply, reset, memory };
})();
