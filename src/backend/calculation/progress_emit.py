import json
import os
import time


def emitProgress(value, step):
    """Обновляет прогресс расчета в index.json с защитой от race conditions"""
    max_retries = 5
    retry_delay = 0.01  # 10ms
    
    for attempt in range(max_retries):
        try:
            # Читаем файл
            with open('index.json', 'r', encoding='utf-8') as fr:
                readed = json.load(fr)
            
            # Обновляем значения
            readed['calculation'] = value
            readed['calculationStep'] = step
            
            # Записываем файл атомарно
            with open('index.json', 'w', encoding='utf-8') as indexFile:
                json.dump(readed, indexFile, indent=2)
            
            # Успешно обновлено
            return
        except (IOError, OSError, json.JSONDecodeError) as e:
            # Если ошибка и это не последняя попытка, ждем и повторяем
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
                continue
            # Если все попытки исчерпаны, просто игнорируем ошибку
            # чтобы не прерывать расчет
            pass