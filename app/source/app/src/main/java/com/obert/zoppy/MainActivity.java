package com.zoppy.shortcut;

import androidx.appcompat.app.AppCompatActivity;

import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.text.InputType;
import android.text.TextUtils;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import java.util.List;

public class MainActivity extends AppCompatActivity {

    String id;
    TextView user, enterdomain, subdomain;
    Button save;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Find Views
        user = findViewById(R.id.tv_link);
        subdomain = findViewById(R.id.input_subdomain);
        enterdomain = findViewById(R.id.tv_enterDomainText);
        save = findViewById(R.id.btn_save);

        // After starting the app, make everything invisible
        user.setVisibility(View.INVISIBLE);
        subdomain.setVisibility(View.INVISIBLE);
        enterdomain.setVisibility(View.INVISIBLE);

        // Get the Domain of the user
        SharedPreferences setting = getApplicationContext().getSharedPreferences("SETTINGS", MODE_PRIVATE);
        String savedDomain = setting.getString("savedDomain","error");

        // If the user hasn't entered his domain yet, prompt him to do.
        if(savedDomain.equals("error")){
            user.setVisibility(View.INVISIBLE);
            subdomain.setVisibility(View.VISIBLE);
            enterdomain.setVisibility(View.VISIBLE);
            save.setVisibility(View.VISIBLE);

            subdomain.setInputType(InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS);

            // Save the Domain
            save.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View view) {
                    String enteredDomain = subdomain.getText().toString().trim();

                    // Check if there is any Text passed into the Field
                    if(TextUtils.isEmpty(enteredDomain)){
                        subdomain.setError(getResources().getString(R.string.notvalid));
                    }else{
                        SharedPreferences setting = getApplicationContext().getSharedPreferences("SETTINGS", MODE_PRIVATE);
                        SharedPreferences.Editor editor = setting.edit();
                        editor.putString("savedDomain",enteredDomain);
                        editor.commit();
                        finish();
                        startActivity(getIntent());
                    }
                }
            });
        }
        // If there already is a stored Domain, parse the URI and open the Browser
        else{
            user.setVisibility(View.VISIBLE);
            subdomain.setVisibility(View.INVISIBLE);
            enterdomain.setVisibility(View.INVISIBLE);
            save.setVisibility(View.INVISIBLE);

            Uri uri = getIntent().getData();
            if(uri != null){
                List<String> params = uri.getPathSegments();
                try{
                    id = params.get(params.size()-1);
                }catch (Exception e)
                {
                    id = "";
                }



                String phone = uri.getQueryParameter("phone");

                String url;
                if(phone==null){
                    if(id.equals(""))
                        url = "https://"+savedDomain+".zoppy.app";
                    else
                        url = "https://"+savedDomain+".zoppy.app?phone="+id;
                }else{
                    url = "https://"+savedDomain+".zoppy.app?phone="+phone;
                }

                user.setText("Redirecionando para "+ url);
                Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                startActivity(browserIntent);
            }else{
                user.setText("Olá "+ savedDomain);
            }
        }
    }
}