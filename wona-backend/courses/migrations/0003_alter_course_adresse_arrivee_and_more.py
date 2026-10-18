from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("courses", "0002_historiquestatut_messagecourse_paiement_signalement_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="course",
            name="adresse_arrivee",
            field=models.TextField(max_length=2048),
        ),
        migrations.AlterField(
            model_name="course",
            name="adresse_depart",
            field=models.TextField(max_length=2048),
        ),
    ]
