import json
from pathlib import Path

from shapely.geometry import shape, mapping

ROOT = Path(__file__).resolve().parents[1]

SOURCE = (
    ROOT
    / "data/railways/raw/N02-25_GML/UTF-8/"
    / "N02-25_RailroadSection.geojson"
)

OUTPUT = ROOT / "public/railways/railways-lite.geojson"

# 緯度経度座標で約10〜20m程度の簡略化
SIMPLIFY_TOLERANCE = 0.00015

JR_OPERATORS = {
    "北海道旅客鉄道",
    "東日本旅客鉄道",
    "東海旅客鉄道",
    "西日本旅客鉄道",
    "四国旅客鉄道",
    "九州旅客鉄道",
}

MAJOR_PRIVATE_OPERATORS = {
    "東武鉄道",
    "西武鉄道",
    "京成電鉄",
    "京王電鉄",
    "小田急電鉄",
    "東急電鉄",
    "京浜急行電鉄",
    "相模鉄道",
    "名古屋鉄道",
    "近畿日本鉄道",
    "南海電気鉄道",
    "京阪電気鉄道",
    "阪急電鉄",
    "阪神電気鉄道",
    "西日本鉄道",
    "東京地下鉄",
}

SUBWAY_LINES_BY_OPERATOR = {
    "札幌市": {
        "南北線",
        "東西線",
        "東豊線",
    },
    "仙台市": {
        "南北線",
        "東西線",
    },
    "東京都": {
        "浅草線",
        "三田線",
        "新宿線",
        "大江戸線",
    },
    "横浜市": {
        "1号線",
        "3号線",
        "4号線",
        "ブルーライン",
        "グリーンライン",
    },
    "名古屋市": {
        "東山線",
        "名城線",
        "名港線",
        "鶴舞線",
        "桜通線",
        "上飯田線",
    },
    "京都市": {
        "烏丸線",
        "東西線",
    },
    "大阪市高速電気軌道": {
        "1号線(御堂筋線)",
        "2号線(谷町線)",
        "3号線(四つ橋線)",
        "4号線(中央線)",
        "5号線(千日前線)",
        "6号線(堺筋線)",
        "7号線(長堀鶴見緑地線)",
        "8号線(今里筋線)",
    },
    "神戸市": {
        "西神線",
        "山手線",
        "西神延伸線",
        "海岸線",
        "北神線",
    },
    "福岡市": {
        "空港線",
        "箱崎線",
        "七隈線",
    },
}

SUBWAY_OPERATORS = set(SUBWAY_LINES_BY_OPERATOR)

ALLOWED_OPERATORS = (
    JR_OPERATORS
    | MAJOR_PRIVATE_OPERATORS
    | SUBWAY_OPERATORS
)


def should_include(properties):
    operator = str(properties.get("N02_004", "")).strip()
    line = str(properties.get("N02_003", "")).strip()

    if operator not in ALLOWED_OPERATORS:
        return False

    if operator in SUBWAY_LINES_BY_OPERATOR:
        return line in SUBWAY_LINES_BY_OPERATOR[operator]

    return True


def simplify_geometry(geometry):
    if not geometry:
        return geometry

    simplified = shape(geometry).simplify(
        SIMPLIFY_TOLERANCE,
        preserve_topology=True,
    )

    return mapping(simplified)


with SOURCE.open(encoding="utf-8") as file:
    railway_data = json.load(file)

# 路線色
# JRは全社共通で黒。
JR_COLOR = "#111111"

# 地下鉄は路線ごとの代表色。
SUBWAY_LINE_COLORS = {
    # 東京メトロ
    ("東京地下鉄", "銀座線"): "#f39700",
    ("東京地下鉄", "丸ノ内線"): "#e60012",
    ("東京地下鉄", "日比谷線"): "#9caeb7",
    ("東京地下鉄", "東西線"): "#00a7db",
    ("東京地下鉄", "千代田線"): "#00a650",
    ("東京地下鉄", "有楽町線"): "#d7c447",
    ("東京地下鉄", "半蔵門線"): "#9b7cb6",
    ("東京地下鉄", "南北線"): "#00ada9",
    ("東京地下鉄", "副都心線"): "#bb641d",

    # 都営地下鉄
    ("東京都", "浅草線"): "#e85298",
    ("東京都", "三田線"): "#0079c2",
    ("東京都", "新宿線"): "#6cbb5a",
    ("東京都", "大江戸線"): "#b6007a",

    # 札幌
    ("札幌市", "南北線"): "#00843d",
    ("札幌市", "東西線"): "#f58220",
    ("札幌市", "東豊線"): "#00a1de",

    # 仙台
    ("仙台市", "南北線"): "#00a650",
    ("仙台市", "東西線"): "#00a0e9",

    # 横浜
    ("横浜市", "1号線"): "#0068b7",
    ("横浜市", "3号線"): "#0068b7",
    ("横浜市", "4号線"): "#00a650",
    ("横浜市", "ブルーライン"): "#0068b7",
    ("横浜市", "グリーンライン"): "#00a650",

    # 名古屋
    ("名古屋市", "東山線"): "#f6be00",
    ("名古屋市", "名城線"): "#9c7eb9",
    ("名古屋市", "名港線"): "#9c7eb9",
    ("名古屋市", "鶴舞線"): "#00a0de",
    ("名古屋市", "桜通線"): "#e85298",
    ("名古屋市", "上飯田線"): "#e85298",

    # 京都
    ("京都市", "烏丸線"): "#009944",
    ("京都市", "東西線"): "#e85298",

    # Osaka Metro
    ("大阪市高速電気軌道", "1号線(御堂筋線)"): "#e5171f",
    ("大阪市高速電気軌道", "2号線(谷町線)"): "#522886",
    ("大阪市高速電気軌道", "3号線(四つ橋線)"): "#0078ba",
    ("大阪市高速電気軌道", "4号線(中央線)"): "#019a66",
    ("大阪市高速電気軌道", "5号線(千日前線)"): "#e44d93",
    ("大阪市高速電気軌道", "6号線(堺筋線)"): "#814721",
    ("大阪市高速電気軌道", "7号線(長堀鶴見緑地線)"): "#a9cc51",
    ("大阪市高速電気軌道", "8号線(今里筋線)"): "#ee7b1a",

    # 神戸
    ("神戸市", "西神線"): "#00a650",
    ("神戸市", "山手線"): "#00a650",
    ("神戸市", "西神延伸線"): "#00a650",
    ("神戸市", "北神線"): "#00a650",
    ("神戸市", "海岸線"): "#0072bc",

    # 福岡
    ("福岡市", "空港線"): "#f39800",
    ("福岡市", "箱崎線"): "#0072bc",
    ("福岡市", "七隈線"): "#00a650",
}

# 私鉄は事業者ごとの識別色。
PRIVATE_OPERATOR_COLORS = {
    "東武鉄道": "#0067b1",
    "西武鉄道": "#007ac3",
    "京成電鉄": "#005aaa",
    "京王電鉄": "#d40077",
    "小田急電鉄": "#0085c8",
    "東急電鉄": "#e60012",
    "京浜急行電鉄": "#e60012",
    "相模鉄道": "#0066b3",
    "名古屋鉄道": "#d71920",
    "近畿日本鉄道": "#f58220",
    "南海電気鉄道": "#009a44",
    "京阪電気鉄道": "#00843d",
    "阪急電鉄": "#7b1f3a",
    "阪神電気鉄道": "#f58220",
    "西日本鉄道": "#0072bc",
}


def soften_color(hex_color, amount):
    """指定色を白と混ぜて、柔らかいパステルカラーにする。"""
    value = str(hex_color or "").lstrip("#")

    if len(value) != 6:
        return "#94a3b8"

    try:
        red = int(value[0:2], 16)
        green = int(value[2:4], 16)
        blue = int(value[4:6], 16)
    except ValueError:
        return "#94a3b8"

    def mix(channel):
        return round(channel + (255 - channel) * amount)

    return f"#{mix(red):02x}{mix(green):02x}{mix(blue):02x}"


def find_subway_color(operator, line):
    exact_color = SUBWAY_LINE_COLORS.get((operator, line))

    if exact_color:
        return exact_color

    # N02では「2号線日比谷線」のように号線番号が付く場合があるため、
    # 同じ事業者内で路線名が含まれていれば一致として扱う。
    for (candidate_operator, candidate_line), color in SUBWAY_LINE_COLORS.items():
        if candidate_operator != operator:
            continue

        if candidate_line in line:
            return color

    return None


def railway_color(operator, line):
    operator = str(operator or "").strip()
    line = str(line or "").strip()

    # JRは通常地図では黒。黒地図時の白への切替はMapLibre側で行う。
    if "旅客鉄道" in operator:
        return JR_COLOR

    subway_color = find_subway_color(operator, line)
    if subway_color:
        # 地下鉄は路線識別を残すため、少しだけ淡色化。
        return soften_color(subway_color, 0.22)

    private_color = PRIVATE_OPERATOR_COLORS.get(operator)
    if private_color:
        # 私鉄はより柔らかく、落ち着いたパステル調にする。
        return soften_color(private_color, 0.43)

    return "#94a3b8"


selected_features = []

for feature in railway_data.get("features", []):
    properties = feature.get("properties", {})

    if not should_include(properties):
        continue

    selected_features.append(
        {
            "type": "Feature",
            "properties": {
                "line": properties.get("N02_003"),
                "operator": properties.get("N02_004"),
                "color": railway_color(
                    properties.get("N02_004"),
                    properties.get("N02_003"),
                ),
            },
            "geometry": simplify_geometry(feature.get("geometry")),
        }
    )

output_data = {
    "type": "FeatureCollection",
    "features": selected_features,
}

OUTPUT.parent.mkdir(parents=True, exist_ok=True)

with OUTPUT.open("w", encoding="utf-8") as file:
    json.dump(
        output_data,
        file,
        ensure_ascii=False,
        separators=(",", ":"),
    )

operators = sorted({
    feature["properties"]["operator"]
    for feature in selected_features
})

lines = sorted({
    (
        feature["properties"]["operator"],
        feature["properties"]["line"],
    )
    for feature in selected_features
})

print(f"source features: {len(railway_data.get('features', []))}")
print(f"selected features: {len(selected_features)}")
print(f"operators: {len(operators)}")
print(f"lines: {len(lines)}")
print(f"size: {OUTPUT.stat().st_size / 1024 / 1024:.2f} MB")
