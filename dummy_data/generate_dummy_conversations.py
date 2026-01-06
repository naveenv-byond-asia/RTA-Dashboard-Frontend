#!/usr/bin/env python3
"""
Generate dummy conversational data using LM Studio's OpenAI-compatible API.
"""

import argparse
import json
import csv
import os
import random
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Tuple
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

DEFAULT_BASE_URL = "http://127.0.0.1:1234"
DEFAULT_MODEL = "ibm/granite-4-h-tiny"

SYSTEM_PROMPT = (
    """
You are an AI-powered digital avatar deployed by the Roads and Transport Authority Dubai and stationed at Al Jafiliya Bus Station 1. Your primary role is to assist commuters, visitors, and residents with nearby location-based information, guidance, and general enquiries in a helpful, accurate, and human manner.

You must always use the attached JSON knowledge base as your single source of truth when answering any question related to nearby places, including but not limited to restaurants, cafes, hotels, malls, mosques, ATMs, and money exchange services. You are not allowed to invent locations, guess details, or reference places that are not present in the provided JSON. If a user asks for information that does not exist in the knowledge base, you should politely say that you do not currently have that information and offer the closest relevant alternative from the data you do have.

You should reason internally over the JSON data to determine proximity, relevance, distance, and suitability based on the user’s request. For example, if a user asks for something “nearby,” you should prioritize entries with the shortest distance. If a user asks for something “open late,” you should consider opening hours. If a user asks for affordability, consider average price ranges. Your answers should feel intelligent and situational, not robotic or templated.

Your responses must always sound natural, conversational, and human, as if a friendly and knowledgeable local person is speaking. You should never sound like you are reading from a database, never mention JSON, datasets, schemas, or internal structures, and never expose raw data formats. Speak in complete sentences, vary your phrasing, and adapt your tone to feel warm, calm, and approachable. Do not use bullet points, numbered lists, headings, symbols, or markdown of any kind. Every response should read like normal spoken language.

You should proactively help users by gently suggesting relevant follow-up information when appropriate. For example, if someone asks for a restaurant, you may naturally mention how far it is or what kind of food it serves. If someone asks for a mosque, you may mention whether it is suitable for Friday prayers if that information exists. Keep suggestions subtle and helpful, never overwhelming.

If a user asks for directions, explain them in simple, human terms using landmarks and distance, not technical navigation jargon. If a user is unsure or vague, ask a brief, friendly clarification question before answering.

You also have a personal identity to make interactions feel more human. Your name is Ayaan. You are 28 years old. You grew up in Dubai and are familiar with the city’s neighborhoods, public transport culture, and everyday commuter needs. You studied information systems and urban mobility in the UAE, which is why you enjoy helping people navigate places efficiently and comfortably. You should not over-share these details, but they may subtly influence your tone and confidence when speaking.

At all times, remain polite, neutral, culturally respectful, and aligned with RTA values. You do not provide legal advice, medical advice, or emergency services. If a user asks for something outside your scope, respond calmly and redirect them to appropriate official channels where possible.

Your goal is to make every person who interacts with you feel guided, understood, and supported, just as a helpful human assistant at the station would do, while always grounding your answers in the attached knowledge base.
"""
)

QUESTION_TEMPLATES = [
    "How do I get from Al Jafiliya bus stop to {name}?",
    "Which bus should I take from Al Jafiliya to reach {name}?",
    "I am at Al Jafiliya bus stop. What is the best bus route to {name}?",
    "Can you suggest a bus route from Al Jafiliya to {name}?",
    "Need directions by bus from Al Jafiliya to {name}.",
]
RAMADAN_MOSQUE_DAY_TEMPLATES = [
    "I need a nearby mosque for dhuhr. How do I get to {name} from Al Jafiliya?",
    "Is {name} the closest mosque? What bus should I take from Al Jafiliya?",
    "Looking for a mosque for daytime prayers. How do I reach {name} by bus?",
]
RAMADAN_MOSQUE_NIGHT_TEMPLATES = [
    "I want to go to taraweeh at {name}. Which bus should I take?",
    "How do I get from Al Jafiliya to {name} for night prayers?",
    "Is there a bus route to {name} for taraweeh tonight?",
]
RAMADAN_FOOD_NIGHT_TEMPLATES = [
    "Any iftar places near {name}? How do I reach it by bus?",
    "I am looking for a late dinner near {name}. Which bus should I take?",
    "Is {name} open late? How do I get there from Al Jafiliya?",
]

MISSING_ANSWER_RATE = 0.1
MOSQUE_WEIGHT = 6
RESTAURANT_WEIGHT = 2
DEFAULT_WEIGHT = 1
MALL_WEIGHT = 3
HOTEL_WEIGHT = 2
ATM_EXCHANGE_WEIGHT = 2
DATA_DATE_RANGE = (datetime(2025, 3, 1), datetime(2025, 3, 31))
RAMADAN_DAY_START_MINUTE = 5 * 60
RAMADAN_DAY_END_MINUTE = 18 * 60 + 30
RAMADAN_NIGHT_END_MINUTE = 2 * 60

RAMADAN_RANGES = {
    2024: (datetime(2024, 3, 11), datetime(2024, 4, 9)),
    2025: (datetime(2025, 3, 1), datetime(2025, 3, 31)),
}

RESTAURANT_CATEGORIES = {
    "restaurant",
    "restaurants",
    "restaurants_cafes_bars",
    "restaurants_cafes",
    "cafes",
    "bars",
}
MOSQUE_CATEGORIES = {"mosque", "mosques"}
MALL_CATEGORIES = {"mall", "malls"}
HOTEL_CATEGORIES = {"hotel", "hotels"}
ATM_EXCHANGE_CATEGORIES = {
    "atm",
    "atms",
    "money_exchange",
    "atms_money_exchanges",
    "atms_money_exchange",
    "atms_money_exchanges",
}


def call_lmstudio(
    base_url: str, model: str, prompt: str, temperature: float
) -> Tuple[str, int]:
    url = base_url.rstrip("/") + "/v1/chat/completions"
    payload = {
        "model": model,
        "temperature": temperature,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
    }
    data = json.dumps(payload).encode("utf-8")
    req = Request(url, data=data, headers={"Content-Type": "application/json"})

    started = time.perf_counter()
    try:
        with urlopen(req, timeout=120) as resp:
            body = resp.read().decode("utf-8")
    except HTTPError as exc:
        raise RuntimeError(f"HTTP error {exc.code}: {exc.reason}") from exc
    except URLError as exc:
        raise RuntimeError(f"Connection error: {exc.reason}") from exc

    parsed = json.loads(body)
    latency_ms = int((time.perf_counter() - started) * 1000)
    return parsed["choices"][0]["message"]["content"], latency_ms


def load_knowledge_base(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def flatten_locations(knowledge_base: Dict[str, Any]) -> List[Tuple[str, Dict[str, Any]]]:
    locations: List[Tuple[str, Dict[str, Any]]] = []
    for key, items in knowledge_base.items():
        if key == "reference_location":
            continue
        if not isinstance(items, list):
            continue
        for item in items:
            locations.append((key, item))
    return locations


def build_answer_prompt(question: str, category: str, location: Dict[str, Any]) -> str:
    details = {
        "name": location.get("name"),
        "category": category,
        "distance_m": location.get("distance_m"),
        "type": location.get("type"),
        "cuisine": location.get("cuisine"),
        "opening_hours": location.get("opening_hours"),
        "rating": location.get("rating"),
    }
    details_json = json.dumps(details, ensure_ascii=True)
    return (
        f"User question: {question}\n"
        f"Destination details: {details_json}\n"
        "Answer with a helpful bus route suggestion from Al Jafiliya bus stop. "
        "Keep it short and practical."
    )


def get_ramadan_range(year: int) -> Tuple[datetime, datetime]:
    start, end = RAMADAN_RANGES.get(
        year, (datetime(year, 3, 10), datetime(year, 4, 8))
    )
    return start, end


def is_ramadan_date(timestamp: datetime) -> bool:
    start, end = get_ramadan_range(timestamp.year)
    return start.date() <= timestamp.date() <= end.date()


def minutes_since_midnight(timestamp: datetime) -> int:
    return timestamp.hour * 60 + timestamp.minute


def is_ramadan_daytime(timestamp: datetime) -> bool:
    minute = minutes_since_midnight(timestamp)
    return RAMADAN_DAY_START_MINUTE <= minute < RAMADAN_DAY_END_MINUTE


def is_ramadan_nighttime(timestamp: datetime) -> bool:
    minute = minutes_since_midnight(timestamp)
    return minute >= RAMADAN_DAY_END_MINUTE or minute <= RAMADAN_NIGHT_END_MINUTE


def random_minute_in_range(start_minute: int, end_minute: int) -> int:
    if end_minute < start_minute:
        return random_minute_in_range(end_minute, start_minute)
    return random.randint(start_minute, end_minute)


def random_time_for_ramadan() -> Tuple[int, int]:
    if random.random() < 0.6:
        if random.random() < 0.7:
            minute_of_day = random_minute_in_range(RAMADAN_DAY_END_MINUTE, 23 * 60 + 59)
        else:
            minute_of_day = random_minute_in_range(0, RAMADAN_NIGHT_END_MINUTE)
    else:
        minute_of_day = random_minute_in_range(
            RAMADAN_DAY_START_MINUTE, RAMADAN_DAY_END_MINUTE - 1
        )
    hour = minute_of_day // 60
    minute = minute_of_day % 60
    return hour, minute


def random_time_outside_ramadan() -> Tuple[int, int]:
    if random.random() < 0.65:
        hour = random.randint(7, 18)
    else:
        hour = random.randint(19, 23)
    minute = random.randint(0, 59)
    return hour, minute


def random_timestamp() -> datetime:
    start, end = DATA_DATE_RANGE
    total_days = (end - start).days
    offset_days = random.randint(0, max(total_days, 0))
    timestamp = start + timedelta(days=offset_days)
    if is_ramadan_date(timestamp):
        hour, minute = random_time_for_ramadan()
    else:
        hour, minute = random_time_outside_ramadan()
    return timestamp.replace(hour=hour, minute=minute, second=0, microsecond=0)


def category_weight(category: str) -> int:
    key = (category or "").lower()
    if key in MOSQUE_CATEGORIES:
        return MOSQUE_WEIGHT
    if key in RESTAURANT_CATEGORIES:
        return RESTAURANT_WEIGHT
    if key in MALL_CATEGORIES:
        return MALL_WEIGHT
    if key in HOTEL_CATEGORIES:
        return HOTEL_WEIGHT
    if key in ATM_EXCHANGE_CATEGORIES:
        return ATM_EXCHANGE_WEIGHT
    return DEFAULT_WEIGHT


def group_for_category(category: str) -> str:
    key = (category or "").lower()
    if key in MOSQUE_CATEGORIES:
        return "mosque"
    if key in RESTAURANT_CATEGORIES:
        return "restaurant"
    if key in MALL_CATEGORIES:
        return "mall"
    if key in HOTEL_CATEGORIES:
        return "hotel"
    if key in ATM_EXCHANGE_CATEGORIES:
        return "atm_exchange"
    return "other"


def pick_category(
    timestamp: datetime, categories_by_group: Dict[str, List[str]]
) -> str:
    if is_ramadan_date(timestamp) and is_ramadan_daytime(timestamp):
        group_weights = {
            "mosque": 25,
            "restaurant": 1,
            "mall": 1,
            "hotel": 1,
            "atm_exchange": 1,
            "other": 1,
        }
    elif is_ramadan_date(timestamp) and is_ramadan_nighttime(timestamp):
        group_weights = {
            "restaurant": 10,
            "mosque": 6,
            "mall": 2,
            "hotel": 2,
            "atm_exchange": 1,
            "other": 1,
        }
    else:
        all_categories = [
            category for groups in categories_by_group.values() for category in groups
        ]
        if not all_categories:
            return ""
        weights = [category_weight(category) for category in all_categories]
        return random.choices(all_categories, weights=weights, k=1)[0]

    available_groups = [
        group for group, categories in categories_by_group.items() if categories
    ]
    if not available_groups:
        return ""
    groups = [group for group in available_groups if group in group_weights]
    weights = [group_weights[group] for group in groups]
    chosen_group = random.choices(groups, weights=weights, k=1)[0]
    categories = categories_by_group.get(chosen_group, [])
    if not categories:
        fallback_categories = [
            category
            for group in available_groups
            for category in categories_by_group.get(group, [])
        ]
        return random.choice(fallback_categories)
    return random.choice(categories)


def build_question_for_time(
    category: str, location: Dict[str, Any], timestamp: datetime
) -> str:
    name = location.get("name", "this location")
    if is_ramadan_date(timestamp):
        key = (category or "").lower()
        if key in MOSQUE_CATEGORIES:
            if is_ramadan_daytime(timestamp):
                template = random.choice(RAMADAN_MOSQUE_DAY_TEMPLATES)
            else:
                template = random.choice(RAMADAN_MOSQUE_NIGHT_TEMPLATES)
            return template.format(name=name)
        if key in RESTAURANT_CATEGORIES and is_ramadan_nighttime(timestamp):
            template = random.choice(RAMADAN_FOOD_NIGHT_TEMPLATES)
            return template.format(name=name)
    template = random.choice(QUESTION_TEMPLATES)
    return template.format(name=name)


def generate_conversations(
    base_url: str,
    model: str,
    count: int,
    temperature: float,
    seed: int,
    delay_s: float,
    knowledge_base_path: str,
) -> List[Dict[str, Any]]:
    random.seed(seed)
    knowledge_base = load_knowledge_base(knowledge_base_path)
    locations = flatten_locations(knowledge_base)
    locations_by_category: Dict[str, List[Dict[str, Any]]] = {}
    categories_by_group: Dict[str, List[str]] = {}
    for category, location in locations:
        locations_by_category.setdefault(category, []).append(location)
        group = group_for_category(category)
        categories_by_group.setdefault(group, [])
        if category not in categories_by_group[group]:
            categories_by_group[group].append(category)

    conversations: List[Dict[str, Any]] = []
    total = count if count > 0 else len(locations)
    for idx in range(total):
        created_at = random_timestamp()
        category = pick_category(created_at, categories_by_group)
        category_locations = locations_by_category.get(category)
        if not category_locations:
            fallback = [
                location
                for location_list in locations_by_category.values()
                for location in location_list
            ]
            location = random.choice(fallback)
        else:
            location = random.choice(category_locations)
        question = build_question_for_time(category, location, created_at)
        prompt = build_answer_prompt(question, category, location)
        answer, latency_ms = call_lmstudio(base_url, model, prompt, temperature)
        if random.random() < MISSING_ANSWER_RATE:
            answer = ""
        conv = {
            "id": f"conv_{seed}_{idx}",
            "category": category,
            "location": location.get("name"),
            "messages": [
                {"role": "user", "content": question},
                {"role": "assistant", "content": answer.strip()},
            ],
            "meta": {
                "model": model,
                "source": "lmstudio",
                "date": created_at.strftime("%Y-%m-%d"),
                "time": created_at.strftime("%H:%M:%S"),
                "latency_ms": latency_ms,
            },
        }
        conversations.append(conv)

        if delay_s > 0:
            time.sleep(delay_s)

    return conversations


def write_json(path: str, conversations: List[Dict[str, Any]]) -> None:
    parent = os.path.dirname(path)
    if parent:
        os.makedirs(parent, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(conversations, f, ensure_ascii=True, indent=2)


def write_csv(path: str, conversations: List[Dict[str, Any]]) -> None:
    parent = os.path.dirname(path)
    if parent:
        os.makedirs(parent, exist_ok=True)
    fieldnames = [
        "id",
        "category",
        "location",
        "user_question",
        "assistant_answer",
        "date",
        "time",
        "latency_ms",
    ]
    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for conv in conversations:
            messages = conv.get("messages", [])
            user_msg = messages[0]["content"] if messages else ""
            assistant_msg = messages[1]["content"] if len(messages) > 1 else ""
            meta = conv.get("meta", {})
            writer.writerow(
                {
                    "id": conv.get("id", ""),
                    "category": conv.get("category", ""),
                    "location": conv.get("location", ""),
                    "user_question": user_msg,
                    "assistant_answer": assistant_msg,
                    "date": meta.get("date", ""),
                    "time": meta.get("time", ""),
                    "latency_ms": meta.get("latency_ms", ""),
                }
            )


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate dummy conversational data via LM Studio."
    )
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--count", type=int, default=25)
    parser.add_argument("--temperature", type=float, default=0.7)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--delay", type=float, default=0.0, help="Delay after request (s)")
    parser.add_argument(
        "--knowledge-base",
        default="knowledgge_base.json",
        help="Path to knowledge base JSON file",
    )
    parser.add_argument(
        "--json-output",
        default="dummy_conversations.json",
        help="Output JSON file path",
    )
    parser.add_argument(
        "--csv-output",
        default="dummy_conversations.csv",
        help="Output CSV file path",
    )
    args = parser.parse_args()

    conversations = generate_conversations(
        base_url=args.base_url,
        model=args.model,
        count=args.count,
        temperature=args.temperature,
        seed=args.seed,
        delay_s=args.delay,
        knowledge_base_path=args.knowledge_base,
    )
    write_json(args.json_output, conversations)
    write_csv(args.csv_output, conversations)
    print(
        f"Wrote {len(conversations)} conversations to "
        f"{args.json_output} and {args.csv_output}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
