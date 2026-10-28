# Продолжение кольца для широкого экрана

Создано встроенным ImageGen, режим редактирования (outpainting) по исходнику `dist/assets/air-ribbon.png`.

Результат: `dist/assets/air-ribbon-extended.png` (1774 × 887), оптимизированный рабочий файл: `dist/assets/air-ribbon-extended.webp`. Файл не растянут: панорама отображается через object-fit: cover с сохранением пропорций. На экранах до 760 px используется исходная квадратная иллюстрация `dist/assets/air-ribbon.webp`, панорамный фон скрыт. Порог выбора source совпадает с порогом расположения двух панелей рядом.

Промпт, переданный инструменту:

Use case: precise-object-edit / outpainting. Edit target: attached square artwork of a translucent white organza ribbon loop on a powder-blue background. Extend the CANVAS ONLY TO THE RIGHT to create a panoramic 2:1 image (about 2508 x 1254). Keep the entire original square image in the LEFT HALF at its original proportions and original scale, with the original loop, folds, colors, lighting, texture and left negative space unchanged. Do NOT stretch, zoom, crop, mirror or move the original artwork. Generate a new seamless continuation in the RIGHT HALF: continue the exact translucent frosted-white organza fabric already crossing the original right edge, with flowing curved folds, an airy broad open arc and light tails gradually relaxing into clean powder-blue sky. The original loop remains fully in the left half. The right extension is calm and spacious because a transparent website form will sit on top of it. Match the original blue gradient seamlessly at the boundary. White icy-blue delicate fabric, soft diffuse daylight, understated pearlescent edges. Single continuous coherent sculpture, no duplicate independent ring, no hard seam, no new objects, no people, no text, no logos, no UI, no watermark. The key requirement is true right-side outpainting with the square left artwork preserved, not resizing the square to a wide image.

