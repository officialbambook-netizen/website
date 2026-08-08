(function () {
  'use strict';

  var URLS = {
    product: 'https://mybambook.com/product',
    productBuy: 'https://mybambook.com/product#pdp-buy-col',
    productSize: 'https://mybambook.com/product#fit',
    shipping: 'https://mybambook.com/shipping-returns',
    returns: 'https://mybambook.com/refund-policy',
    orders: 'https://mybambook.com/orders',
    support: 'mailto:support@mybambook.com?subject=%D7%A2%D7%96%D7%A8%D7%94%20%D7%9E%D7%94%D7%90%D7%AA%D7%A8'
  };

  var NODE_LIST = [
    {
      id: 'menu',
      question: 'במה תרצו עזרה?',
      answer: 'בחרו שאלה ונמשיך משם.',
      children: ['how_it_works', 'benefits', 'day_night', 'materials', 'sizing', 'purchase_options', 'shipping_returns', 'support']
    },
    {
      id: 'how_it_works',
      question: 'איך הכפפות עובדות?',
      answer: 'הכפפות יוצרות לחיצה ממוקדת סביב כף היד ומפרקי האצבעות. זו התמיכה שהן מפעילות בזמן הלבישה.',
      children: ['benefits', 'compression_feel', 'open_fingertips', 'medical_boundary']
    },
    {
      id: 'benefits',
      question: 'מה היתרונות של הכפפות?',
      answer: 'הלחיצה הממוקדת מעודדת זרימת דם טובה יותר בכף היד. זרימת דם טובה עוזרת להתמודד עם נפיחות, דלקת ונוקשות.',
      children: ['morning_stiffness', 'everyday_tasks', 'medical_boundary']
    },
    {
      id: 'compression_feel',
      question: 'איך הלחיצה אמורה להרגיש?',
      answer: 'הלחיצה צריכה להרגיש כמו יד יציבה שאוחזת, לא כמו חוסם. אם קצות האצבעות נרדמים, מתקררים או משנים צבע, הסירו את הכפפות ובדקו מידה גדולה יותר או פנו אלינו.',
      children: ['support'],
      productUrl: URLS.productSize,
      emphasizeProduct: true
    },
    {
      id: 'open_fingertips',
      question: 'למה קצות האצבעות פתוחים?',
      answer: 'העיצוב הפתוח משאיר את קצות האצבעות חופשיים, כדי שתוכלו להשתמש בידיים בזמן שהכפפות תומכות בכף היד.',
      children: ['everyday_tasks']
    },
    {
      id: 'medical_boundary',
      question: 'האם הכפפות מחליפות טיפול רפואי?',
      answer: 'לא. הכפפות נועדו לתמיכה יומיומית ומשתלבות לצד הטיפול שלכם. הן אינן מיועדות לאבחן מצב רפואי או להחליף ייעוץ וטיפול מקצועי.',
      children: ['support']
    },
    {
      id: 'morning_stiffness',
      question: 'איך משתמשים בהן כשיש נוקשות בבוקר?',
      answer: 'אפשר ללבוש את הכפפות לפני השינה, כדי שהידיים יקבלו תמיכה לאורך הלילה ועד הבוקר.',
      children: ['sleep', 'compression_feel', 'sizing']
    },
    {
      id: 'everyday_tasks',
      question: 'מה אפשר לעשות כשהכפפות על הידיים?',
      answer: 'קצות האצבעות נשארים חופשיים, כך שאפשר להשתמש בטלפון, להקליד, לבשל ולעשות עבודות יד בלי להסיר את הכפפות.',
      children: []
    },
    {
      id: 'day_night',
      question: 'אפשר ללבוש את הכפפות ביום וגם בלילה?',
      answer: 'כן. הכפפות מיועדות ללבישה ביום ובלילה. בד הבמבוק קל ונושם וקצות האצבעות פתוחים, ולכן הן מתאימות לשני המצבים.',
      children: ['sleep', 'everyday_tasks', 'hot_weather', 'bamboo_properties']
    },
    {
      id: 'sleep',
      question: 'אפשר לישון עם הכפפות?',
      answer: 'כן. הכפפות מיועדות גם ללבישה בלילה. לובשים אותן לפני השינה ומסירים כשקמים.',
      children: ['compression_feel', 'hot_weather']
    },
    {
      id: 'hot_weather',
      question: 'מה עושים אם חם בלילה?',
      answer: 'בד הבמבוק קל ונושם וקצות האצבעות פתוחים. בלילה חם במיוחד אפשר ללבוש את הכפפות בערב ולהסיר אותן לפני השינה.',
      children: ['bamboo_properties']
    },
    {
      id: 'materials',
      question: 'ממה הכפפות עשויות?',
      answer: 'הכפפות עשויות בד במבוק.',
      children: ['bamboo_properties', 'bamboo_percentage', 'machine_washable', 'design_details']
    },
    {
      id: 'bamboo_properties',
      question: 'מה מיוחד בבד הבמבוק?',
      answer: 'בד הבמבוק קל ונושם, ונעים על העור גם בלבישה ממושכת.',
      children: ['machine_washable']
    },
    {
      id: 'bamboo_percentage',
      question: 'האם הכפפות עשויות מ־100% במבוק?',
      answer: 'בד הבמבוק מאומת, אבל אחוזי ההרכב המדויקים של הבד עדיין לא אושרו. לכן אנחנו לא מציגים את הכפפות כ־100% במבוק.',
      children: ['support']
    },
    {
      id: 'machine_washable',
      question: 'אפשר לכבס את הכפפות במכונה?',
      answer: 'כן. הכפפות ניתנות לכביסה במכונה.',
      children: []
    },
    {
      id: 'design_details',
      question: 'באיזה צבע ועיצוב הכפפות מגיעות?',
      answer: 'הכפפות אפורות, מיועדות למבוגרים ומתאימות לנשים ולגברים. הן מגיעות עד שורש כף היד ומשאירות את קצות האצבעות פתוחים.',
      children: ['open_fingertips', 'sizing']
    },
    {
      id: 'sizing',
      question: 'איך בוחרים מידה?',
      answer: 'בוחרים מידה לפי היקף מפרקי האצבעות. מדדו את ההיקף והשוו אותו לטבלת המידות.',
      children: ['size_ranges', 'between_sizes', 'compression_feel', 'support'],
      productUrl: URLS.productSize,
      emphasizeProduct: true
    },
    {
      id: 'size_ranges',
      question: 'מהם טווחי המידות?',
      answer: 'מידה S מתאימה להיקף 15–18 ס״מ, מידה M להיקף 18–20 ס״מ, ומידה L להיקף 20–23 ס״מ.',
      children: ['size_s', 'size_m', 'size_l', 'between_sizes'],
      productUrl: URLS.productSize,
      emphasizeProduct: true
    },
    {
      id: 'size_s',
      question: 'איזו מידה מתאימה ל־15–18 ס״מ?',
      answer: 'היקף של 15–18 ס״מ מתאים למידה S.',
      children: ['compression_feel', 'current_price'],
      productUrl: URLS.productSize,
      emphasizeProduct: true
    },
    {
      id: 'size_m',
      question: 'איזו מידה מתאימה ל־18–20 ס״מ?',
      answer: 'היקף של 18–20 ס״מ מתאים למידה M.',
      children: ['compression_feel', 'current_price'],
      productUrl: URLS.productSize,
      emphasizeProduct: true
    },
    {
      id: 'size_l',
      question: 'איזו מידה מתאימה ל־20–23 ס״מ?',
      answer: 'היקף של 20–23 ס״מ מתאים למידה L.',
      children: ['compression_feel', 'current_price'],
      productUrl: URLS.productSize,
      emphasizeProduct: true
    },
    {
      id: 'between_sizes',
      question: 'מה עושים אם נמצאים בין שתי מידות?',
      answer: '18 ס״מ היא נקודת מעבר בין S ל־M, ו־20 ס״מ היא נקודת מעבר בין M ל־L. אם אינכם בטוחים, כתבו לנו לפני ההזמנה ונעזור לבחור.',
      children: ['compression_feel', 'support'],
      productUrl: URLS.productSize,
      emphasizeProduct: true
    },
    {
      id: 'purchase_options',
      question: 'אילו אפשרויות רכישה קיימות?',
      answer: 'אפשר לבחור זוג אחד, שני זוגות, שלושה זוגות או ארבעה זוגות. המחיר המעודכן של כל אפשרות מופיע בעמוד המוצר ובתשלום.',
      children: ['current_price', 'how_to_order', 'two_plus_bonus', 'sizing'],
      productUrl: URLS.productBuy,
      emphasizeProduct: true
    },
    {
      id: 'current_price',
      question: 'איפה רואים את המחיר המעודכן?',
      answer: 'המחיר המעודכן מופיע ליד כל אפשרות רכישה בעמוד המוצר, והמחיר המחייב מופיע בתשלום.',
      children: ['how_to_order'],
      productUrl: URLS.productBuy,
      emphasizeProduct: true
    },
    {
      id: 'how_to_order',
      question: 'איך מזמינים את הכפפות?',
      answer: 'בעמוד המוצר בוחרים מידה, בוחרים בין זוג אחד לארבעה זוגות וממשיכים לתשלום.',
      children: ['shipping_returns'],
      productUrl: URLS.productBuy,
      emphasizeProduct: true
    },
    {
      id: 'two_plus_bonus',
      question: 'מה מקבלים בהזמנה של שני זוגות ומעלה?',
      answer: 'בהזמנה של שני זוגות ומעלה מצורף ללא תשלום מדריך טיפוח הידיים.',
      children: ['current_price', 'how_to_order'],
      productUrl: URLS.productBuy,
      emphasizeProduct: true
    },
    {
      id: 'shipping_returns',
      question: 'מה חשוב לדעת על משלוח והחזרה?',
      answer: 'המשלוח נמשך בדרך כלל 7–14 ימי עסקים. יש אחריות להחזר כספי למשך 60 יום, לפי תנאי מדיניות ההחזרות.',
      children: ['shipping_time', 'tracking', 'guarantee', 'return_process'],
      emphasizeProduct: true
    },
    {
      id: 'shipping_time',
      question: 'כמה זמן נמשך המשלוח?',
      answer: 'המשלוח נמשך בדרך כלל 7–14 ימי עסקים. במקרים נדירים הוא עשוי להימשך יותר.',
      children: ['tracking', 'support'],
      links: [{ label: 'למדיניות המשלוחים', href: URLS.shipping }],
      emphasizeProduct: true
    },
    {
      id: 'tracking',
      question: 'איך עוקבים אחרי הזמנה?',
      answer: 'קישור המעקב נשלח במייל לאחר יציאת ההזמנה. אם לא קיבלתם אותו, כתבו לתמיכה עם מספר ההזמנה.',
      children: ['support'],
      links: [{ label: 'לעמוד מעקב ההזמנה', href: URLS.orders }],
      emphasizeProduct: true
    },
    {
      id: 'guarantee',
      question: 'איך עובדת אחריות 60 הימים?',
      answer: 'אפשר לבקש החזר כספי בתוך 60 יום, לפי תנאי מדיניות ההחזרות. מתחילים בפנייה לתמיכה עם מספר ההזמנה.',
      children: ['return_process', 'support'],
      links: [{ label: 'למדיניות ההחזרות', href: URLS.returns }],
      emphasizeProduct: true
    },
    {
      id: 'return_process',
      question: 'איך מתחילים החזרה?',
      answer: 'כתבו לתמיכה עם מספר ההזמנה לפני שליחת המוצר. תקבלו את כתובת ההחזרה ואת ההנחיות להמשך.',
      children: ['support'],
      links: [{ label: 'למדיניות ההחזרות', href: URLS.returns }],
      emphasizeProduct: true
    },
    {
      id: 'support',
      question: 'איך יוצרים קשר עם התמיכה?',
      answer: 'אפשר לפנות לצוות התמיכה במייל:\nsupport@mybambook.com',
      children: [],
      links: [{ label: 'שלחו מייל לתמיכה', href: URLS.support }]
    }
  ];

  function validateTree(nodeList, rootId, shouldThrow) {
    var errors = [];
    var nodes = {};

    nodeList.forEach(function (node) {
      if (!node || !node.id) {
        errors.push('node_without_id');
        return;
      }
      if (nodes[node.id]) errors.push('duplicate_id:' + node.id);
      nodes[node.id] = node;
    });

    if (!nodes[rootId]) errors.push('missing_root:' + rootId);

    nodeList.forEach(function (node) {
      if (!node || !node.id) return;
      if (!String(node.question || '').trim()) errors.push('empty_question:' + node.id);
      if (!String(node.answer || '').trim()) errors.push('empty_answer:' + node.id);
      if (!Array.isArray(node.children)) errors.push('invalid_children:' + node.id);
      (node.children || []).forEach(function (childId) {
        if (childId === node.id) errors.push('self_link:' + node.id);
        if (!nodes[childId]) errors.push('missing_child:' + node.id + '>' + childId);
      });
      var siblingLabels = {};
      (node.children || []).forEach(function (childId) {
        if (!nodes[childId]) return;
        var label = nodes[childId].question.trim();
        if (siblingLabels[label]) errors.push('duplicate_sibling_label:' + node.id + '>' + label);
        siblingLabels[label] = true;
      });
    });

    var visiting = {};
    var visited = {};
    function visit(nodeId) {
      if (visiting[nodeId]) {
        errors.push('cycle:' + nodeId);
        return;
      }
      if (visited[nodeId] || !nodes[nodeId]) return;
      visiting[nodeId] = true;
      nodes[nodeId].children.forEach(visit);
      visiting[nodeId] = false;
      visited[nodeId] = true;
    }
    visit(rootId);

    Object.keys(nodes).forEach(function (nodeId) {
      if (!visited[nodeId]) errors.push('unreachable:' + nodeId);
    });

    if (errors.length && shouldThrow !== false) {
      throw new Error('Invalid Bambook assistant tree: ' + errors.join(', '));
    }
    return errors;
  }

  validateTree(NODE_LIST, 'menu');

  var nodes = {};
  NODE_LIST.forEach(function (node) { nodes[node.id] = node; });

  window.BambookAssistantKnowledge = {
    brand: 'MyBambook',
    status: 'עוזר דיגיטלי',
    rootId: 'menu',
    nodeList: NODE_LIST,
    nodes: nodes,
    urls: URLS,
    labels: {
      followUps: 'מה תרצו לדעת עכשיו?',
      back: 'חזרה',
      menu: 'לתפריט הראשי',
      product: 'לעמוד המוצר',
      support: 'עדיין צריכים עזרה? כתבו לתמיכה'
    },
    validateTree: validateTree
  };
})();
