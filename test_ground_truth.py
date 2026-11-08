import json

# Ground truth from media_1794112348585_e222085a.png
GROUND_TRUTH = {
    "turno_1": [
        {"horario": "06:30 - 08:00", "obj": 90, "real": 107, "obj_ac": 90, "real_ac": 100, "scrap": 7, "op": "OP10", "min": 0, "paros": "Certifica mat acumulado 3er turno / Ruptura hta caja, desbaste y acabado / Ajustes"},
        {"horario": "08:00 - 09:00", "obj": 60, "real": 63, "obj_ac": 150, "real_ac": 150, "scrap": 13, "op": "OP20", "min": 0, "paros": "Ajustes x ruptura hta"},
        {"horario": "09:00 - 10:00", "obj": 60, "real": 31, "obj_ac": 210, "real_ac": 175, "scrap": 6, "op": "OP30", "min": 40, "paros": "Cambio de bujes de brazo por despostillado"},
        {"horario": "10:00 - 11:00", "obj": 60, "real": 58, "obj_ac": 270, "real_ac": 220, "scrap": 13, "op": "OP10", "min": 0, "paros": "Producción regular"},
        {"horario": "11:00 - 12:00", "obj": 30, "real": 0, "obj_ac": 300, "real_ac": 220, "scrap": 0, "op": "LÍNEA", "min": 30, "paros": "Comedor"},
        {"horario": "12:00 - 13:00", "obj": 60, "real": 0, "obj_ac": 360, "real_ac": 220, "scrap": 0, "op": "OP30", "min": 40, "paros": "Cambio de espárragos de brazo / Variación diam. P.S. Ajuste"},
        {"horario": "13:00 - 14:00", "obj": 60, "real": 27, "obj_ac": 420, "real_ac": 240, "scrap": 7, "op": "OP30", "min": 40, "paros": "c/molde, ajustes"},
        {"horario": "14:00 - 15:00", "obj": 60, "real": 49, "obj_ac": 480, "real_ac": 285, "scrap": 5, "op": "OP40", "min": 40, "paros": "Ajuste de alabeo P.S."}
    ],
    "total_1er_turno": {
        "lider": "Antonia",
        "venta": 285,
        "scrap": 51,
        "paros_min": 190
    },
    "turno_2": [
        {"horario": "15:00 - 16:00", "obj": 60, "real": 17, "obj_ac": 60, "real_ac": 16, "scrap": 1, "op": "LÍNEA", "min": 15, "paros": "Break"},
        {"horario": "16:00 - 17:00", "obj": 60, "real": 49, "obj_ac": 120, "real_ac": 61, "scrap": 4, "op": "OP30", "min": 100, "paros": "Falla de lavadora, no da ciclo de lavado por falta de sensor de puerta"},
        {"horario": "17:00 - 18:00", "obj": 60, "real": 71, "obj_ac": 180, "real_ac": 116, "scrap": 16, "op": "OP20", "min": 0, "paros": "Ajustes de proceso"},
        {"horario": "18:00 - 19:00", "obj": 60, "real": 0, "obj_ac": 240, "real_ac": 0, "scrap": 0, "op": "LÍNEA", "min": 0, "paros": "Ajuste de línea (anulado en pizarra)"},
        {"horario": "19:00 - 20:00", "obj": 30, "real": 34, "obj_ac": 270, "real_ac": 32, "scrap": 2, "op": "OP10", "min": 0, "paros": "Producción regular"},
        {"horario": "20:00 - 21:00", "obj": 60, "real": 0, "obj_ac": 330, "real_ac": 32, "scrap": 0, "op": "OP20", "min": 0, "paros": "Ajuste continuo"},
        {"horario": "21:00 - 22:00", "obj": 60, "real": 56, "obj_ac": 390, "real_ac": 80, "scrap": 8, "op": "OP10", "min": 0, "paros": "Producción regular"},
        {"horario": "22:00 - 23:00", "obj": 60, "real": 0, "obj_ac": 450, "real_ac": 0, "scrap": 0, "op": None, "min": 0, "paros": "Hora programada / Por fabricar"}
    ],
    "total_2do_turno": {
        "lider": "Santiago V. / Ing. Roberto Garza",
        "venta": 80,
        "scrap": 31,
        "paros_min": 115
    },
    "total_del_dia": {
        "meta_diaria": 1350,
        "meta_al_corte": 870,
        "real_acumulado": 365,
        "scrap_total": 82,
        "paros_min_total": 305,
        "porcentaje_avance_dia": 27.0,
        "porcentaje_avance_corte": 42.0
    }
}

print("Ground truth validado:")
print(f"Total del Día: Real={GROUND_TRUTH['total_del_dia']['real_acumulado']} / {GROUND_TRUTH['total_del_dia']['meta_diaria']} (T1={GROUND_TRUTH['total_1er_turno']['venta']}, T2={GROUND_TRUTH['total_2do_turno']['venta']})")
print(f"Scrap Total: {GROUND_TRUTH['total_del_dia']['scrap_total']} pzas (T1={GROUND_TRUTH['total_1er_turno']['scrap']}, T2={GROUND_TRUTH['total_2do_turno']['scrap']})")
print(f"Paros Totales: {GROUND_TRUTH['total_del_dia']['paros_min_total']} min (T1={GROUND_TRUTH['total_1er_turno']['paros_min']}, T2={GROUND_TRUTH['total_2do_turno']['paros_min']})")

