# Bakumatsu Toast AR MVP

GitHub Pages 向けの WebAR サンプルです。  
特定のビールラベルを画像ターゲットにし、ラベルの横の空間に幕末武士キャラクターが現れて乾杯する演出を行います。

## 現在の実装内容

- MindAR + A-Frame ベース
- ラベル認識をトリガーに演出開始
- ラベル面ではなく、ラベルの横・少し手前・少し下にキャラクターを配置
- 出現時に煙、金色の光、スケールアップ
- 乾杯モーション
- プレースホルダー画像実装
- 将来的に GLB または動画へ差し替え可能

## ファイル構成

```text
hijikata-ar-app/
├─ index.html
├─ app.js
├─ style.css
├─ README.md
└─ assets/
   ├─ beer-label.jpg
   ├─ beer-label.mind        ← 自分で作成して配置
   ├─ hijikata-placeholder.png
   ├─ beer-mug.png
   ├─ smoke.png
   ├─ glow.png
   └─ shadow.png
```

## 1. `.mind` ファイルの作成方法

1. `assets/beer-label.jpg` を用意します
2. MindAR の Image Target Compiler を使います
3. 生成された `beer-label.mind` を `assets/` フォルダに保存します

最初は缶や瓶の曲面ではなく、ラベル画像を紙に印刷した平面で試すと認識が安定しやすいです。

## 2. ローカルで確認する方法

ファイルを直接開かず、ローカルサーバーで実行してください。

```bash
python -m http.server 8000
```

その後、ブラウザで `http://localhost:8000` を開きます。  
ただしスマホ実機のカメラ確認は HTTPS 公開環境が望ましいです。

## 3. GitHub Pages で公開する方法

1. このフォルダ一式を GitHub リポジトリへ push
2. GitHub の Settings > Pages を開く
3. Branch を `main`、フォルダを `/root` に設定
4. 公開された HTTPS URL をスマホで開く

## 4. スマホでの確認方法

### iPhone
- Safari 推奨

### Android
- Chrome 推奨

手順:
1. GitHub Pages の公開 URL を開く
2. 「ARを開始」を押す
3. カメラ権限を許可
4. ラベルを映す

## 5. ラベル認識が不安定な場合の対処

- 明るい場所で試す
- ラベルをなるべく正面から映す
- 強い反射を避ける
- 最初は缶や瓶ではなく、印刷した平面ラベルで試す
- ラベル全体が画面内に入るようにする

## 6. 差し替え方法

### GLB に差し替える
- `assets/hijikata-drink.glb` を配置
- `index.html` 内の `#character` を `a-gltf-model` に変更
- GLB 内蔵アニメーションがある場合は `animation-mixer` を使う

### 動画に差し替える
- 背景除去済みまたはグリーンバックの動画を `assets/hijikata-toast.mp4` として配置
- `a-video` などで `#character` 相当部分を差し替える

### プレースホルダー画像を差し替える
- `assets/hijikata-placeholder.png` を差し替えるだけで見た目を更新できます

## 7. 注意

- カメラ利用には HTTPS が必要です
- GitHub Pages は静的ホスティングなのでサーバー処理は使っていません
- 商用利用前に、ラベル表現、ブランド、生成素材の権利確認を行ってください
